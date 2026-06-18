'use client';

import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { useVictoriaStore } from '@/store';
import {
  REMINDER_DEVICE_ID_KEY,
  REMINDER_DEVICE_SECRET_KEY,
  REMINDER_SPEAK_KEY,
  buildReminderSummary,
  computeNextReminderTrigger,
  computeSnoozedTrigger,
  decryptReminderRow,
  encryptReminderDraft,
  type ReminderDraft,
  type ReminderRow,
} from '@/lib/reminders';
import type { Reminder } from '@/types';

let bootstrapReminderPushPromise: Promise<
  { ok: true } | { ok: false; reason: string }
> | null = null;

function canUseRemoteReminderBackend() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

function shouldFallbackToLocal(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('not configured') ||
    normalized.includes('missing-vapid-key') ||
    normalized.includes('push-setup-failed') ||
    normalized.includes('bootstrap-failed') ||
    normalized.includes('sync-failed') ||
    normalized.includes('fetch failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('timeout')
  );
}

function buildLocalReminder(draft: ReminderDraft): Reminder {
  const now = Date.now();
  const nextTriggerAt =
    computeNextReminderTrigger(draft.scheduledFor, draft.repeat, new Date(now - 1000)) ??
    draft.scheduledFor;

  return {
    id: uuidv4(),
    title: draft.title,
    note: draft.note,
    scheduledFor: draft.scheduledFor,
    nextTriggerAt,
    repeat: draft.repeat,
    category: draft.category,
    sound: draft.sound,
    voicePreferred: draft.voicePreferred,
    timeZone: draft.timeZone,
    active: true,
    createdAt: now,
    updatedAt: now,
    syncState: 'local',
  };
}

async function saveLocalReminder(draft: ReminderDraft) {
  const reminder = buildLocalReminder(draft);
  await db.reminders.put(reminder);
  return reminder;
}

async function patchLocalReminder(reminderId: string, updates: Partial<ReminderDraft> & { active?: boolean }) {
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) {
    throw new Error('Reminder not found.');
  }

  const scheduledFor = updates.scheduledFor ?? reminder.scheduledFor;
  const repeat = updates.repeat ?? reminder.repeat;
  const nextTriggerAt = computeNextReminderTrigger(
    scheduledFor,
    repeat,
    new Date(Date.now() - 1000)
  ) ?? scheduledFor;

  const updated: Reminder = {
    ...reminder,
    title: updates.title ?? reminder.title,
    note: updates.note ?? reminder.note,
    scheduledFor,
    nextTriggerAt,
    repeat,
    category: updates.category ?? reminder.category,
    sound: updates.sound ?? reminder.sound,
    voicePreferred: updates.voicePreferred ?? reminder.voicePreferred,
    timeZone: updates.timeZone ?? reminder.timeZone,
    active: updates.active ?? reminder.active,
    updatedAt: Date.now(),
    syncState: 'local',
  };

  await db.reminders.put(updated);
  return updated;
}

async function applyLocalReminderAction(reminderId: string, action: 'done' | 'snooze' | 'open') {
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) return null;
  if (action === 'open') return reminder;

  const now = new Date();
  const nowIso = now.toISOString();
  let updated: Reminder = {
    ...reminder,
    updatedAt: now.getTime(),
    syncState: 'local',
  };

  if (action === 'snooze') {
    updated = {
      ...updated,
      active: true,
      nextTriggerAt: computeSnoozedTrigger(),
    };
  } else {
    const nextTriggerAt = computeNextReminderTrigger(reminder.nextTriggerAt, reminder.repeat, now);
    updated = nextTriggerAt
      ? {
          ...updated,
          completedAt: nowIso,
          lastTriggeredAt: nowIso,
          nextTriggerAt,
          active: true,
        }
      : {
          ...updated,
          completedAt: nowIso,
          lastTriggeredAt: nowIso,
          active: false,
        };
  }

  await db.reminders.put(updated);
  return updated;
}

function speakReminderWithCurrentSettings(reminder: Reminder) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const { settings } = useVictoriaStore.getState();
  if (!settings.voiceEnabled || !reminder.voicePreferred) return;

  const utterance = new SpeechSynthesisUtterance(
    `${reminder.title}.${reminder.note ? ` ${reminder.note}` : ''}`
  );
  utterance.rate = settings.voiceRate;
  utterance.pitch = settings.voicePitch;
  utterance.lang = settings.language;
  if (settings.selectedVoiceName) {
    const voice = window.speechSynthesis.getVoices().find((entry) => entry.name === settings.selectedVoiceName);
    if (voice) utterance.voice = voice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function getStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function randomSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getReminderDeviceCredentials() {
  if (typeof window === 'undefined') return null;

  let deviceId = getStoredValue(REMINDER_DEVICE_ID_KEY);
  let deviceSecret = getStoredValue(REMINDER_DEVICE_SECRET_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    if (!setStoredValue(REMINDER_DEVICE_ID_KEY, deviceId)) return null;
  }

  if (!deviceSecret) {
    deviceSecret = randomSecret();
    if (!setStoredValue(REMINDER_DEVICE_SECRET_KEY, deviceSecret)) return null;
  }

  return { deviceId, deviceSecret };
}

function getReminderHeaders() {
  const creds = getReminderDeviceCredentials();
  if (!creds) {
    throw new Error('Reminder credentials are unavailable in this browser.');
  }

  return {
    'Content-Type': 'application/json',
    'x-victoria-reminder-device': creds.deviceId,
    'x-victoria-reminder-secret': creds.deviceSecret,
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(normalized);
  return Uint8Array.from(rawData.split('').map((char) => char.charCodeAt(0)));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getPushFailureReason(error: unknown) {
  if (!error) return 'push-setup-failed';

  if (error instanceof Error) {
    const message = error.message || '';
    if (
      message === 'service-worker-timeout' ||
      message === 'service-worker-activation-timeout' ||
      message === 'service-worker-redundant' ||
      message === 'subscription-read-timeout' ||
      message === 'subscription-create-timeout' ||
      message === 'bootstrap-request-timeout'
    ) {
      return message;
    }

    const normalizedName = 'name' in error && typeof error.name === 'string' ? error.name : '';
    if (normalizedName === 'NotAllowedError') return 'subscription-blocked';
    if (normalizedName === 'AbortError') return 'subscription-aborted';
    if (normalizedName === 'InvalidStateError') return 'service-worker-not-ready';
    if (normalizedName === 'InvalidAccessError') return 'invalid-vapid-key';

    if (message) return message;
  }

  return 'push-setup-failed';
}

function waitForServiceWorkerActivation(registration: ServiceWorkerRegistration) {
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) {
    return Promise.resolve(registration);
  }

  if (worker.state === 'activated') {
    return Promise.resolve(registration);
  }

  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const handleStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', handleStateChange);
        resolve(registration);
      } else if (worker.state === 'redundant') {
        worker.removeEventListener('statechange', handleStateChange);
        reject(new Error('service-worker-redundant'));
      }
    };

    worker.addEventListener('statechange', handleStateChange);
  });
}

async function registerFreshServiceWorker() {
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return withTimeout(
    navigator.serviceWorker.ready,
    12000,
    'service-worker-timeout'
  );
}

async function ensureServiceWorkerReady() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('unsupported');
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (existingRegistration?.active) {
    return withTimeout(
      navigator.serviceWorker.ready,
      12000,
      'service-worker-timeout'
    );
  }

  const registration = existingRegistration ?? await navigator.serviceWorker.register('/sw.js', { scope: '/' });

  if (registration.installing || registration.waiting) {
    try {
      await withTimeout(
        waitForServiceWorkerActivation(registration),
        12000,
        'service-worker-activation-timeout'
      );
    } catch (error) {
      const reason = getPushFailureReason(error);
      if (reason !== 'service-worker-redundant') {
        throw error;
      }

      const refreshedRegistration = await navigator.serviceWorker.getRegistration();
      if (refreshedRegistration?.active) {
        return withTimeout(
          navigator.serviceWorker.ready,
          12000,
          'service-worker-timeout'
        );
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((entry) => entry.unregister().catch(() => false)));
      return registerFreshServiceWorker();
    }
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    12000,
    'service-worker-timeout'
  );
}

export async function bootstrapReminderPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false as const, reason: 'unsupported' };
  }

  if (!canUseRemoteReminderBackend()) {
    return { ok: false as const, reason: 'local-only-mode' };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false as const, reason: 'missing-vapid-key' };
  }

  if (!('Notification' in window)) {
    return { ok: false as const, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return { ok: false as const, reason: 'permission-denied' };
  }

  if (!bootstrapReminderPushPromise) {
    bootstrapReminderPushPromise = (async () => {
      try {
        const registration = await ensureServiceWorkerReady();
        const existing = await withTimeout(
          registration.pushManager.getSubscription(),
          5000,
          'subscription-read-timeout'
        );
        const subscription = existing ?? await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }),
          8000,
          'subscription-create-timeout'
        );

        const response = await withTimeout(
          fetch('/api/reminders/bootstrap', {
            method: 'POST',
            headers: getReminderHeaders(),
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              userAgent: navigator.userAgent,
            }),
          }),
          8000,
          'bootstrap-request-timeout'
        );

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          return { ok: false as const, reason: error?.error ?? 'bootstrap-failed' };
        }

        return { ok: true as const };
      } catch (error) {
        return {
          ok: false as const,
          reason: getPushFailureReason(error),
        };
      } finally {
        bootstrapReminderPushPromise = null;
      }
    })();
  }

  return bootstrapReminderPushPromise;
}

export async function syncRemindersFromServer() {
  const creds = getReminderDeviceCredentials();
  if (!creds) return { ok: false as const, reason: 'missing-credentials' };

  if (!canUseRemoteReminderBackend()) {
    return {
      ok: true as const,
      reminders: await db.reminders.orderBy('nextTriggerAt').toArray(),
      mode: 'local' as const,
    };
  }

  try {
    const response = await fetch('/api/reminders', {
      method: 'GET',
      headers: getReminderHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const reason = error?.error ?? 'sync-failed';
      if (shouldFallbackToLocal(reason)) {
        return {
          ok: true as const,
          reminders: await db.reminders.orderBy('nextTriggerAt').toArray(),
          mode: 'local' as const,
        };
      }
      return { ok: false as const, reason, mode: 'remote' as const };
    }

    const payload = await response.json();
    const rows = (payload.reminders ?? []) as ReminderRow[];
    const decrypted = await Promise.all(rows.map((row) => decryptReminderRow(row, creds.deviceSecret)));
    await db.reminders.bulkPut(decrypted);

    const ids = new Set(decrypted.map((reminder) => reminder.id));
    const localRows = await db.reminders.toArray();
    const staleIds = localRows
      .filter((reminder) => reminder.syncState === 'synced' && !ids.has(reminder.id))
      .map((reminder) => reminder.id);
    if (staleIds.length > 0) {
      await db.reminders.bulkDelete(staleIds);
    }

    return { ok: true as const, reminders: decrypted, mode: 'remote' as const };
  } catch (error) {
    const reason = getPushFailureReason(error);
    if (shouldFallbackToLocal(reason)) {
      return {
        ok: true as const,
        reminders: await db.reminders.orderBy('nextTriggerAt').toArray(),
        mode: 'local' as const,
      };
    }

    return { ok: false as const, reason, mode: 'remote' as const };
  }
}

export async function createReminderFromDraft(draft: ReminderDraft) {
  const creds = getReminderDeviceCredentials();
  if (!creds) throw new Error('Reminder credentials are unavailable in this browser.');

  if (!canUseRemoteReminderBackend()) {
    return saveLocalReminder(draft);
  }

  try {
    const encrypted = await encryptReminderDraft(draft, creds.deviceSecret);
    const response = await fetch('/api/reminders', {
      method: 'POST',
      headers: getReminderHeaders(),
      body: JSON.stringify(encrypted),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const reason = error?.error ?? 'Could not create reminder.';
      if (shouldFallbackToLocal(reason)) {
        return saveLocalReminder(draft);
      }
      throw new Error(reason);
    }

    const payload = await response.json();
    const reminder = await decryptReminderRow(payload.reminder as ReminderRow, creds.deviceSecret);
    await db.reminders.put(reminder);

    return reminder;
  } catch (error: any) {
    const reason = error?.message ?? 'Could not create reminder.';
    if (shouldFallbackToLocal(reason)) {
      return saveLocalReminder(draft);
    }
    throw error;
  }
}

export async function patchReminder(reminderId: string, updates: Partial<ReminderDraft> & { active?: boolean }) {
  const creds = getReminderDeviceCredentials();
  if (!creds) throw new Error('Reminder credentials are unavailable in this browser.');

  const local = await db.reminders.get(reminderId);
  if (!local) throw new Error('Reminder not found.');

  if (!canUseRemoteReminderBackend() || local.syncState === 'local' || local.syncState === 'pending') {
    return patchLocalReminder(reminderId, updates);
  }

  const merged: ReminderDraft = {
    title: updates.title ?? local.title,
    note: updates.note ?? local.note,
    scheduledFor: updates.scheduledFor ?? local.scheduledFor,
    repeat: updates.repeat ?? local.repeat,
    category: updates.category ?? local.category,
    sound: updates.sound ?? local.sound,
    voicePreferred: updates.voicePreferred ?? local.voicePreferred,
    timeZone: updates.timeZone ?? local.timeZone,
  };

  try {
    const encrypted = await encryptReminderDraft(merged, creds.deviceSecret);
    const response = await fetch(`/api/reminders/${reminderId}`, {
      method: 'PATCH',
      headers: getReminderHeaders(),
      body: JSON.stringify({
        ...encrypted,
        active: updates.active,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const reason = error?.error ?? 'Could not update reminder.';
      if (shouldFallbackToLocal(reason)) {
        return patchLocalReminder(reminderId, updates);
      }
      throw new Error(reason);
    }

    const payload = await response.json();
    const reminder = await decryptReminderRow(payload.reminder as ReminderRow, creds.deviceSecret);
    await db.reminders.put(reminder);
    return reminder;
  } catch (error: any) {
    const reason = error?.message ?? 'Could not update reminder.';
    if (shouldFallbackToLocal(reason)) {
      return patchLocalReminder(reminderId, updates);
    }
    throw error;
  }
}

export async function removeReminder(reminderId: string) {
  const reminder = await db.reminders.get(reminderId);

  if (!canUseRemoteReminderBackend() || reminder?.syncState === 'local' || reminder?.syncState === 'pending') {
    await db.reminders.delete(reminderId);
    return;
  }

  try {
    const response = await fetch(`/api/reminders/${reminderId}`, {
      method: 'DELETE',
      headers: getReminderHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const reason = error?.error ?? 'Could not delete reminder.';
      if (shouldFallbackToLocal(reason)) {
        await db.reminders.delete(reminderId);
        return;
      }
      throw new Error(reason);
    }

    await db.reminders.delete(reminderId);
  } catch (error: any) {
    const reason = error?.message ?? 'Could not delete reminder.';
    if (shouldFallbackToLocal(reason)) {
      await db.reminders.delete(reminderId);
      return;
    }
    throw error;
  }
}

export async function sendReminderAction(reminderId: string, action: 'done' | 'snooze' | 'open') {
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) return null;

  if (!canUseRemoteReminderBackend() || reminder.syncState === 'local' || reminder.syncState === 'pending') {
    return applyLocalReminderAction(reminderId, action);
  }

  try {
    const response = await fetch('/api/reminders/action', {
      method: 'POST',
      headers: getReminderHeaders(),
      body: JSON.stringify({ reminderId, action }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const reason = error?.error ?? 'Could not update reminder.';
      if (shouldFallbackToLocal(reason)) {
        return applyLocalReminderAction(reminderId, action);
      }
      throw new Error(reason);
    }

    const payload = await response.json();
    const updated = payload.reminder
      ? await decryptReminderRow(payload.reminder as ReminderRow, getReminderDeviceCredentials()!.deviceSecret)
      : null;

    if (updated) {
      await db.reminders.put(updated);
    }

    return updated;
  } catch (error: any) {
    const reason = error?.message ?? 'Could not update reminder.';
    if (shouldFallbackToLocal(reason)) {
      return applyLocalReminderAction(reminderId, action);
    }
    throw error;
  }
}

export function queueReminderSpeech(reminderId: string) {
  if (typeof window === 'undefined') return;
  setStoredValue(REMINDER_SPEAK_KEY, reminderId);
}

export function consumeReminderSpeechRequest() {
  if (typeof window === 'undefined') return null;
  const id = getStoredValue(REMINDER_SPEAK_KEY);
  if (!id) return null;
  try {
    window.localStorage.removeItem(REMINDER_SPEAK_KEY);
  } catch {
    // ignore
  }
  return id;
}

export function getReminderSuccessMessage(reminder: Reminder, locale = 'en-US') {
  return `${reminder.title} · ${buildReminderSummary(reminder, locale)}`;
}

export async function dispatchLocalDueReminders() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 0;
  if (Notification.permission !== 'granted') return 0;
  if (canUseRemoteReminderBackend()) return 0;

  const now = new Date();
  const reminders = await db.reminders.toArray();
  const due = reminders.filter(
    (reminder) => reminder.active && new Date(reminder.nextTriggerAt).getTime() <= now.getTime()
  );

  for (const reminder of due) {
    const notification = new Notification(reminder.title, {
      body: reminder.note || 'Open Victoria to check this off.',
      icon: '/icons/icon-192.svg',
      silent: reminder.sound === 'silent',
      tag: `victoria-local-reminder-${reminder.id}`,
    });

    notification.onclick = () => {
      window.focus();
      const url = new URL(window.location.href);
      url.pathname = '/plans';
      url.searchParams.set('tab', 'reminders');
      url.searchParams.set('reminder', reminder.id);
      window.location.href = url.toString();
    };

    if (reminder.voicePreferred) {
      speakReminderWithCurrentSettings(reminder);
    }

    const nextTriggerAt = computeNextReminderTrigger(reminder.nextTriggerAt, reminder.repeat, now);
    await db.reminders.put({
      ...reminder,
      lastTriggeredAt: now.toISOString(),
      completedAt: reminder.repeat === 'once' ? now.toISOString() : reminder.completedAt,
      nextTriggerAt: nextTriggerAt ?? reminder.nextTriggerAt,
      active: Boolean(nextTriggerAt),
      updatedAt: Date.now(),
      syncState: 'local',
    });
  }

  return due.length;
}
