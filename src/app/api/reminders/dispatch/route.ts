import {
  advanceReminderAfterDispatch,
  isReminderBackendConfigured,
  listDueReminderDispatches,
  sendReminderPushNotification,
} from '@/lib/server/reminders';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isReminderBackendConfigured()) {
    return Response.json(
      { error: 'Reminder backend is not configured yet.' },
      { status: 503 }
    );
  }

  const expectedSecret = process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET;
  if (expectedSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 });
    }
  }

  try {
    const due = await listDueReminderDispatches();
    let delivered = 0;

    for (const entry of due) {
      await sendReminderPushNotification(entry.reminder, entry.subscriptions);
      await advanceReminderAfterDispatch(entry.reminder);
      delivered += 1;
    }

    return Response.json({ ok: true, delivered });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not dispatch reminders.' }, { status: 500 });
  }
}
