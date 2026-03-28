self.__WB_DISABLE_DEV_LOGS = true;

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return {};
    }
  })();

  const title = payload.title || 'Victoria reminder';
  const options = {
    body: payload.body || 'Open Victoria to view your reminder.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.reminderId ? `reminder-${payload.reminderId}` : 'victoria-reminder',
    renotify: true,
    requireInteraction: true,
    silent: Boolean(payload.silent),
    data: payload,
    actions: [
      { action: 'done', title: 'Done' },
      { action: 'snooze', title: 'Snooze 15m' },
      { action: 'open', title: 'Open' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

async function postReminderAction(action, data) {
  if (!data?.reminderId || !data?.actionToken) return;
  try {
    await fetch('/api/reminders/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminderId: data.reminderId,
        action,
        actionToken: data.actionToken,
      }),
    });
  } catch {
    // ignore offline action failures
  }
}

async function openReminderClient(path) {
  const allClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of allClients) {
    if ('focus' in client) {
      await client.focus();
      if ('navigate' in client) {
        await client.navigate(path);
      }
      return;
    }
  }

  if (clients.openWindow) {
    await clients.openWindow(path);
  }
}

self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil((async () => {
    if (action === 'done' || action === 'snooze') {
      await postReminderAction(action, data);
    }

    const path = data.path || '/plans?tab=reminders';
    await openReminderClient(path);
  })());
});
