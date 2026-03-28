import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import {
  DEFAULT_REMINDER_SNOOZE_MINUTES,
  computeNextReminderTrigger,
  computeSnoozedTrigger,
  type ReminderRecordPayload,
  type ReminderRow,
} from '@/lib/reminders';
import type { ReminderRepeat } from '@/types';

const REMINDER_TABLE = 'reminders';
const DEVICE_TABLE = 'reminder_devices';
const SUBSCRIPTION_TABLE = 'reminder_push_subscriptions';

type SubscriptionPayload = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isReminderBackendConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

export async function verifyReminderDevice(deviceId: string, deviceSecret: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Reminder backend is not configured.');
  }

  const secretHash = sha256(deviceSecret);
  const { data, error } = await supabase
    .from(DEVICE_TABLE)
    .select('device_id, secret_hash')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const { error: insertError } = await supabase.from(DEVICE_TABLE).insert({
      device_id: deviceId,
      secret_hash: secretHash,
    });

    if (insertError) throw new Error(insertError.message);
    return { supabase, deviceId };
  }

  if (!secureCompare(data.secret_hash, secretHash)) {
    throw new Error('Invalid reminder credentials.');
  }

  await supabase
    .from(DEVICE_TABLE)
    .update({ updated_at: new Date().toISOString() })
    .eq('device_id', deviceId);

  return { supabase, deviceId };
}

export async function upsertReminderSubscription(
  deviceId: string,
  deviceSecret: string,
  subscription: SubscriptionPayload,
  userAgent?: string
) {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Push subscription is incomplete.');
  }

  const { supabase } = await verifyReminderDevice(deviceId, deviceSecret);
  const { error } = await supabase
    .from(SUBSCRIPTION_TABLE)
    .upsert(
      {
        device_id: deviceId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) throw new Error(error.message);
}

function mapReminderPayload(deviceId: string, payload: ReminderRecordPayload) {
  return {
    device_id: deviceId,
    encrypted_title: payload.title.cipherText,
    title_iv: payload.title.iv,
    encrypted_note: payload.note?.cipherText ?? null,
    note_iv: payload.note?.iv ?? null,
    scheduled_for: payload.scheduledFor,
    next_trigger_at: payload.nextTriggerAt,
    repeat_rule: payload.repeat,
    category: payload.category,
    notification_sound: payload.sound,
    voice_preferred: payload.voicePreferred,
    time_zone: payload.timeZone,
    active: payload.active ?? true,
  };
}

export async function listReminderRows(deviceId: string, deviceSecret: string) {
  const { supabase } = await verifyReminderDevice(deviceId, deviceSecret);
  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .select('*')
    .eq('device_id', deviceId)
    .order('active', { ascending: false })
    .order('next_trigger_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReminderRow[];
}

export async function createReminderRow(deviceId: string, deviceSecret: string, payload: ReminderRecordPayload) {
  const { supabase } = await verifyReminderDevice(deviceId, deviceSecret);
  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .insert({
      ...mapReminderPayload(deviceId, payload),
      action_token: sha256(`${deviceId}:${Date.now()}:${Math.random()}`),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ReminderRow;
}

export async function updateReminderRow(
  deviceId: string,
  deviceSecret: string,
  reminderId: string,
  payload: ReminderRecordPayload & { active?: boolean }
) {
  const { supabase } = await verifyReminderDevice(deviceId, deviceSecret);
  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .update({
      ...mapReminderPayload(deviceId, payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId)
    .eq('device_id', deviceId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ReminderRow;
}

export async function deleteReminderRow(deviceId: string, deviceSecret: string, reminderId: string) {
  const { supabase } = await verifyReminderDevice(deviceId, deviceSecret);
  const { error } = await supabase
    .from(REMINDER_TABLE)
    .delete()
    .eq('id', reminderId)
    .eq('device_id', deviceId);

  if (error) throw new Error(error.message);
}

async function getReminderByDevice(reminderId: string, deviceId: string, supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .select('*')
    .eq('id', reminderId)
    .eq('device_id', deviceId)
    .single();

  if (error) throw new Error(error.message);
  return data as ReminderRow;
}

export async function applyReminderActionForDevice(
  deviceId: string,
  deviceSecret: string,
  reminderId: string,
  action: 'done' | 'snooze' | 'open'
) {
  const { supabase } = await verifyReminderDevice(deviceId, deviceSecret);
  const reminder = await getReminderByDevice(reminderId, deviceId, supabase);
  if (action === 'open') return reminder;

  const nowIso = new Date().toISOString();
  let updates: Record<string, unknown> = { updated_at: nowIso };

  if (action === 'done') {
    updates = reminder.repeat_rule === 'once'
      ? { ...updates, active: false, completed_at: nowIso }
      : { ...updates, completed_at: nowIso };
  }

  if (action === 'snooze') {
    updates = {
      ...updates,
      next_trigger_at: computeSnoozedTrigger(DEFAULT_REMINDER_SNOOZE_MINUTES),
      active: true,
    };
  }

  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .update(updates)
    .eq('id', reminderId)
    .eq('device_id', deviceId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ReminderRow;
}

export async function applyReminderActionByToken(
  reminderId: string,
  actionToken: string,
  action: 'done' | 'snooze' | 'open'
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Reminder backend is not configured.');

  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .select('*')
    .eq('id', reminderId)
    .eq('action_token', actionToken)
    .single();

  if (error) throw new Error(error.message);

  const reminder = data as ReminderRow;
  if (action === 'open') return reminder;

  const nowIso = new Date().toISOString();
  const updates =
    action === 'snooze'
      ? {
          next_trigger_at: computeSnoozedTrigger(DEFAULT_REMINDER_SNOOZE_MINUTES),
          updated_at: nowIso,
          active: true,
        }
      : reminder.repeat_rule === 'once'
        ? {
            active: false,
            completed_at: nowIso,
            updated_at: nowIso,
          }
        : {
            completed_at: nowIso,
            updated_at: nowIso,
          };

  const { data: updated, error: updateError } = await supabase
    .from(REMINDER_TABLE)
    .update(updates)
    .eq('id', reminderId)
    .eq('action_token', actionToken)
    .select('*')
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated as ReminderRow;
}

function getNextTriggerAfterDispatch(reminder: ReminderRow) {
  return computeNextReminderTrigger(reminder.next_trigger_at, reminder.repeat_rule as ReminderRepeat, new Date());
}

export async function advanceReminderAfterDispatch(reminder: ReminderRow) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Reminder backend is not configured.');

  const nowIso = new Date().toISOString();
  const nextTriggerAt = getNextTriggerAfterDispatch(reminder);
  const updates = nextTriggerAt
    ? {
        last_triggered_at: nowIso,
        next_trigger_at: nextTriggerAt,
        updated_at: nowIso,
        completed_at: null,
      }
    : {
        last_triggered_at: nowIso,
        active: false,
        updated_at: nowIso,
      };

  const { error } = await supabase
    .from(REMINDER_TABLE)
    .update(updates)
    .eq('id', reminder.id);

  if (error) throw new Error(error.message);
}

export async function listDueReminderDispatches(limit = 20) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Reminder backend is not configured.');

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(REMINDER_TABLE)
    .select('*')
    .eq('active', true)
    .lte('next_trigger_at', nowIso)
    .order('next_trigger_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const reminders = (data ?? []) as ReminderRow[];
  const deviceIds = Array.from(new Set(reminders.map((reminder) => reminder.device_id)));
  const subscriptionsByDevice = new Map<string, Array<{ endpoint: string; p256dh: string; auth: string }>>();

  if (deviceIds.length > 0) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from(SUBSCRIPTION_TABLE)
      .select('device_id, endpoint, p256dh, auth')
      .in('device_id', deviceIds);

    if (subscriptionError) throw new Error(subscriptionError.message);

    for (const subscription of subscriptions ?? []) {
      const list = subscriptionsByDevice.get(subscription.device_id) ?? [];
      list.push(subscription);
      subscriptionsByDevice.set(subscription.device_id, list);
    }
  }

  return reminders.map((reminder) => ({
    reminder,
    subscriptions: subscriptionsByDevice.get(reminder.device_id) ?? [],
  }));
}

function ensureWebPushConfigured() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !subject) {
    throw new Error('VAPID keys are not configured.');
  }

  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
}

export async function sendReminderPushNotification(
  reminder: ReminderRow,
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>
) {
  if (subscriptions.length === 0) return;

  ensureWebPushConfigured();
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Reminder backend is not configured.');

  const payload = JSON.stringify({
    title: 'Victoria reminder',
    body: reminder.voice_preferred
      ? 'Open Victoria to read or hear your reminder.'
      : 'Open Victoria to view your reminder.',
    reminderId: reminder.id,
    actionToken: reminder.action_token,
    path: `/plans?tab=reminders&reminder=${reminder.id}${reminder.voice_preferred ? '&speak=1' : ''}`,
    silent: reminder.notification_sound === 'silent',
  });

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
        {
          TTL: 60,
          urgency: 'high',
        }
      );
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await supabase.from(SUBSCRIPTION_TABLE).delete().eq('endpoint', subscription.endpoint);
      } else {
        throw error;
      }
    }
  }
}
