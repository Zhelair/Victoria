import type { Reminder, ReminderCategory, ReminderRepeat, ReminderSoundMode } from '@/types';

export const REMINDER_DEVICE_ID_KEY = 'victoria-reminder-device-id';
export const REMINDER_DEVICE_SECRET_KEY = 'victoria-reminder-device-secret';
export const REMINDER_SPEAK_KEY = 'victoria-speak-reminder-id';
export const DEFAULT_REMINDER_SNOOZE_MINUTES = 15;

export const REMINDER_REPEAT_OPTIONS: Array<{ value: ReminderRepeat; label: string }> = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
];

export const REMINDER_CATEGORY_OPTIONS: Array<{ value: ReminderCategory; label: string }> = [
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' },
  { value: 'errand', label: 'Errand' },
  { value: 'habit', label: 'Habit' },
];

export const REMINDER_SOUND_OPTIONS: Array<{ value: ReminderSoundMode; label: string }> = [
  { value: 'default', label: 'Default sound' },
  { value: 'silent', label: 'Silent' },
];

export interface ReminderEncryptedField {
  cipherText: string;
  iv: string;
}

export interface ReminderDraft {
  title: string;
  note?: string;
  scheduledFor: string;
  repeat: ReminderRepeat;
  category: ReminderCategory;
  sound: ReminderSoundMode;
  voicePreferred: boolean;
  timeZone: string;
}

export interface ReminderRecordPayload {
  id?: string;
  scheduledFor: string;
  nextTriggerAt: string;
  repeat: ReminderRepeat;
  category: ReminderCategory;
  sound: ReminderSoundMode;
  voicePreferred: boolean;
  timeZone: string;
  active?: boolean;
  title: ReminderEncryptedField;
  note?: ReminderEncryptedField | null;
}

export interface ReminderRow {
  id: string;
  device_id: string;
  encrypted_title: string;
  title_iv: string;
  encrypted_note: string | null;
  note_iv: string | null;
  scheduled_for: string;
  next_trigger_at: string;
  repeat_rule: ReminderRepeat;
  category: ReminderCategory;
  notification_sound: ReminderSoundMode;
  voice_preferred: boolean;
  time_zone: string;
  active: boolean;
  action_token: string;
  last_triggered_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function getBrowserTimeZone() {
  if (typeof Intl === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function trimReminderTitle(value: string) {
  return value.trim().replace(/[.?!]+$/, '').trim();
}

function combineDateAndTime(date: Date, hours: number, minutes: number) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function parseTimeBits(rawHours: string, rawMinutes?: string) {
  const hours = Number(rawHours);
  const minutes = rawMinutes ? Number(rawMinutes) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function computeNextReminderTrigger(
  scheduledFor: string,
  repeat: ReminderRepeat,
  afterDate: Date = new Date()
) {
  const next = new Date(scheduledFor);
  if (Number.isNaN(next.getTime())) return null;

  const bumpDate = () => {
    if (repeat === 'weekly') {
      next.setDate(next.getDate() + 7);
      return;
    }

    next.setDate(next.getDate() + 1);
    if (repeat === 'weekdays') {
      while (isWeekend(next)) {
        next.setDate(next.getDate() + 1);
      }
    }
  };

  if (repeat === 'once') {
    return next.getTime() > afterDate.getTime() ? next.toISOString() : null;
  }

  while (next.getTime() <= afterDate.getTime() || (repeat === 'weekdays' && isWeekend(next))) {
    bumpDate();
  }

  return next.toISOString();
}

export function computeSnoozedTrigger(minutes = DEFAULT_REMINDER_SNOOZE_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function getReminderRepeatLabel(repeat: ReminderRepeat) {
  switch (repeat) {
    case 'daily':
      return 'Daily';
    case 'weekdays':
      return 'Weekdays';
    case 'weekly':
      return 'Weekly';
    default:
      return 'Once';
  }
}

export function formatReminderDateTime(iso: string, locale = 'en-US', timeZone?: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function buildReminderSummary(reminder: Pick<Reminder, 'nextTriggerAt' | 'repeat' | 'timeZone'>, locale = 'en-US') {
  const when = formatReminderDateTime(reminder.nextTriggerAt, locale, reminder.timeZone);
  const repeatLabel = getReminderRepeatLabel(reminder.repeat);
  return reminder.repeat === 'once' ? when : `${repeatLabel} · next ${when}`;
}

function extractReminderTarget(value: string) {
  return trimReminderTitle(
    value
      .replace(/^set a reminder to\s+/i, '')
      .replace(/^remind me to\s+/i, '')
      .replace(/^remind me\s+/i, '')
  );
}

export function detectReminderDraftFromText(text: string, now = new Date()) {
  const trimmed = text.trim();
  if (!/remind me|set a reminder/i.test(trimmed)) return null;

  const timeZone = getBrowserTimeZone();

  const everyWeekdayMatch = trimmed.match(/^(?:set a reminder to|remind me to|remind me)\s+(.+?)\s+every weekday at\s+(\d{1,2})(?::(\d{2}))?$/i);
  if (everyWeekdayMatch) {
    const bits = parseTimeBits(everyWeekdayMatch[2], everyWeekdayMatch[3]);
    if (!bits) return null;
    let next = combineDateAndTime(now, bits.hours, bits.minutes);
    if (next <= now || isWeekend(next)) {
      next.setDate(next.getDate() + 1);
      while (isWeekend(next)) next.setDate(next.getDate() + 1);
      next = combineDateAndTime(next, bits.hours, bits.minutes);
    }
    return {
      title: extractReminderTarget(everyWeekdayMatch[1]),
      scheduledFor: next.toISOString(),
      repeat: 'weekdays' as const,
      category: 'personal' as const,
      sound: 'default' as const,
      voicePreferred: false,
      timeZone,
    };
  }

  const everyDayMatch = trimmed.match(/^(?:set a reminder to|remind me to|remind me)\s+(.+?)\s+every day at\s+(\d{1,2})(?::(\d{2}))?$/i);
  if (everyDayMatch) {
    const bits = parseTimeBits(everyDayMatch[2], everyDayMatch[3]);
    if (!bits) return null;
    let next = combineDateAndTime(now, bits.hours, bits.minutes);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
      next = combineDateAndTime(next, bits.hours, bits.minutes);
    }
    return {
      title: extractReminderTarget(everyDayMatch[1]),
      scheduledFor: next.toISOString(),
      repeat: 'daily' as const,
      category: 'personal' as const,
      sound: 'default' as const,
      voicePreferred: false,
      timeZone,
    };
  }

  const tomorrowMatch = trimmed.match(/^(?:set a reminder to|remind me to|remind me)\s+(.+?)\s+tomorrow at\s+(\d{1,2})(?::(\d{2}))?$/i);
  if (tomorrowMatch) {
    const bits = parseTimeBits(tomorrowMatch[2], tomorrowMatch[3]);
    if (!bits) return null;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduled = combineDateAndTime(tomorrow, bits.hours, bits.minutes);
    return {
      title: extractReminderTarget(tomorrowMatch[1]),
      scheduledFor: scheduled.toISOString(),
      repeat: 'once' as const,
      category: 'personal' as const,
      sound: 'default' as const,
      voicePreferred: false,
      timeZone,
    };
  }

  const relativeMatch = trimmed.match(/^(?:set a reminder to|remind me to|remind me)\s+(.+?)\s+in\s+(\d+)\s+(minute|minutes|hour|hours)$/i);
  if (relativeMatch) {
    const amount = Number(relativeMatch[2]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const multiplier = /hour/i.test(relativeMatch[3]) ? 60 : 1;
    return {
      title: extractReminderTarget(relativeMatch[1]),
      scheduledFor: new Date(now.getTime() + amount * multiplier * 60 * 1000).toISOString(),
      repeat: 'once' as const,
      category: 'personal' as const,
      sound: 'default' as const,
      voicePreferred: false,
      timeZone,
    };
  }

  const todayMatch = trimmed.match(/^(?:set a reminder to|remind me to|remind me)\s+(.+?)\s+at\s+(\d{1,2})(?::(\d{2}))?$/i);
  if (todayMatch) {
    const bits = parseTimeBits(todayMatch[2], todayMatch[3]);
    if (!bits) return null;
    let scheduled = combineDateAndTime(now, bits.hours, bits.minutes);
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    return {
      title: extractReminderTarget(todayMatch[1]),
      scheduledFor: scheduled.toISOString(),
      repeat: 'once' as const,
      category: 'personal' as const,
      sound: 'default' as const,
      voicePreferred: false,
      timeZone,
    };
  }

  return null;
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveReminderKey(secret: string) {
  const data = new TextEncoder().encode(`${secret}:victoria-reminders`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptReminderField(value: string, secret: string): Promise<ReminderEncryptedField> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveReminderKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  );
  return {
    cipherText: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptReminderField(field: ReminderEncryptedField, secret: string) {
  const key = await deriveReminderKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(field.iv) },
    key,
    base64ToBytes(field.cipherText)
  );
  return new TextDecoder().decode(decrypted);
}

export async function encryptReminderDraft(draft: ReminderDraft, secret: string): Promise<ReminderRecordPayload> {
  const title = await encryptReminderField(draft.title, secret);
  const note = draft.note ? await encryptReminderField(draft.note, secret) : null;

  return {
    scheduledFor: draft.scheduledFor,
    nextTriggerAt: computeNextReminderTrigger(draft.scheduledFor, draft.repeat, new Date(Date.now() - 1000)) ?? draft.scheduledFor,
    repeat: draft.repeat,
    category: draft.category,
    sound: draft.sound,
    voicePreferred: draft.voicePreferred,
    timeZone: draft.timeZone,
    title,
    note,
  };
}

export async function decryptReminderRow(row: ReminderRow, secret: string): Promise<Reminder> {
  const title = await decryptReminderField(
    { cipherText: row.encrypted_title, iv: row.title_iv },
    secret
  );
  const note = row.encrypted_note && row.note_iv
    ? await decryptReminderField(
        { cipherText: row.encrypted_note, iv: row.note_iv },
        secret
      )
    : undefined;

  return {
    id: row.id,
    title,
    note,
    scheduledFor: row.scheduled_for,
    nextTriggerAt: row.next_trigger_at,
    repeat: row.repeat_rule,
    category: row.category,
    sound: row.notification_sound,
    voicePreferred: row.voice_preferred,
    timeZone: row.time_zone || 'UTC',
    active: row.active,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    syncState: 'synced',
  };
}
