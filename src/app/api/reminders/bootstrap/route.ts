import { NextRequest } from 'next/server';
import { isReminderBackendConfigured, upsertReminderSubscription, verifyReminderDevice } from '@/lib/server/reminders';

export const runtime = 'nodejs';

function readDeviceHeaders(req: NextRequest) {
  const deviceId = req.headers.get('x-victoria-reminder-device');
  const deviceSecret = req.headers.get('x-victoria-reminder-secret');
  if (!deviceId || !deviceSecret) {
    throw new Error('Missing reminder device credentials.');
  }
  return { deviceId, deviceSecret };
}

export async function POST(req: NextRequest) {
  if (!isReminderBackendConfigured()) {
    return Response.json(
      { error: 'Reminder backend is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const { deviceId, deviceSecret } = readDeviceHeaders(req);
    const body = await req.json();

    await verifyReminderDevice(deviceId, deviceSecret);

    if (body?.subscription) {
      await upsertReminderSubscription(deviceId, deviceSecret, body.subscription, body.userAgent);
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not bootstrap reminders.' }, { status: 400 });
  }
}
