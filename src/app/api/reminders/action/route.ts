import { NextRequest } from 'next/server';
import {
  applyReminderActionByToken,
  applyReminderActionForDevice,
  isReminderBackendConfigured,
} from '@/lib/server/reminders';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isReminderBackendConfigured()) {
    return Response.json(
      { error: 'Reminder backend is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const action = body?.action as 'done' | 'snooze' | 'open';
    if (!body?.reminderId || !action) {
      throw new Error('Reminder action is incomplete.');
    }

    const actionToken = body?.actionToken as string | undefined;
    if (actionToken) {
      const reminder = await applyReminderActionByToken(body.reminderId, actionToken, action);
      return Response.json({ reminder });
    }

    const deviceId = req.headers.get('x-victoria-reminder-device');
    const deviceSecret = req.headers.get('x-victoria-reminder-secret');
    if (!deviceId || !deviceSecret) {
      throw new Error('Missing reminder credentials.');
    }

    const reminder = await applyReminderActionForDevice(deviceId, deviceSecret, body.reminderId, action);
    return Response.json({ reminder });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not update reminder.' }, { status: 400 });
  }
}
