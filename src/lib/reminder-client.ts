'use client';

import { db } from '@/lib/db';
import {
  REMINDER_DEVICE_ID_KEY,
  REMINDER_DEVICE_SECRET_KEY,
  REMINDER_SPEAK_KEY,
  buildReminderSummary,
  decryptReminderRow,
  encryptReminderDraft,
  type ReminderDraft,
  type ReminderRow,
} from '@/lib/reminders';
import type { Reminder } from '@/types';

let bootstrapReminderPushPromise: Promise<
  { ok: true } | { ok: false; reason: string }
> | null = null;

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

  const response = await fetch('/api/reminders', {
    method: 'GET',
    headers: getReminderHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    return { ok: false as const, reason: error?.error ?? 'sync-failed' };
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

  return { ok: true as const, reminders: decrypted };
}

export async function createReminderFromDraft(draft: ReminderDraft) {
  const creds = getReminderDeviceCredentials();
  if (!creds) throw new Error('Reminder credentials are unavailable in this browser.');

  const encrypted = await encryptReminderDraft(draft, creds.deviceSecret);
  const response = await fetch('/api/reminders', {
    method: 'POST',
    headers: getReminderHeaders(),
    body: JSON.stringify(encrypted),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? 'Could not create reminder.');
  }

  const payload = await response.json();
  const reminder = await decryptReminderRow(payload.reminder as ReminderRow, creds.deviceSecret);
  await db.reminders.put(reminder);

  return reminder;
}

export async function patchReminder(reminderId: string, updates: Partial<ReminderDraft> & { active?: boolean }) {
  const creds = getReminderDeviceCredentials();
  if (!creds) throw new Error('Reminder credentials are unavailable in this browser.');

  const local = await db.reminders.get(reminderId);
  if (!local) throw new Error('Reminder not found.');

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
    throw new Error(error?.error ?? 'Could not update reminder.');
  }

  const payload = await response.json();
  const reminder = await decryptReminderRow(payload.reminder as ReminderRow, creds.deviceSecret);
  await db.reminders.put(reminder);
  return reminder;
}

export async function removeReminder(reminderId: string) {
  const response = await fetch(`/api/reminders/${reminderId}`, {
    method: 'DELETE',
    headers: getReminderHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? 'Could not delete reminder.');
  }

  await db.reminders.delete(reminderId);
}

export async function sendReminderAction(reminderId: string, action: 'done' | 'snooze' | 'open') {
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) return null;

  const response = await fetch('/api/reminders/action', {
    method: 'POST',
    headers: getReminderHeaders(),
    body: JSON.stringify({ reminderId, action }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? 'Could not update reminder.');
  }

  const payload = await response.json();
  const updated = payload.reminder
    ? await decryptReminderRow(payload.reminder as ReminderRow, getReminderDeviceCredentials()!.deviceSecret)
    : null;

  if (updated) {
    await db.reminders.put(updated);
  }

  return updated;
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
