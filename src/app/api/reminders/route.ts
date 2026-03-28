import { NextRequest } from 'next/server';
import type { ReminderRecordPayload } from '@/lib/reminders';
import { createReminderRow, isReminderBackendConfigured, listReminderRows } from '@/lib/server/reminders';

export const runtime = 'nodejs';

function readDeviceHeaders(req: NextRequest) {
  const deviceId = req.headers.get('x-victoria-reminder-device');
  const deviceSecret = req.headers.get('x-victoria-reminder-secret');
  if (!deviceId || !deviceSecret) {
    throw new Error('Missing reminder device credentials.');
  }
  return { deviceId, deviceSecret };
}

export async function GET(req: NextRequest) {
  if (!isReminderBackendConfigured()) {
    return Response.json(
      { error: 'Reminder backend is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const { deviceId, deviceSecret } = readDeviceHeaders(req);
    const reminders = await listReminderRows(deviceId, deviceSecret);
    return Response.json({ reminders });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not load reminders.' }, { status: 400 });
  }
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
    const payload = (await req.json()) as ReminderRecordPayload;
    const reminder = await createReminderRow(deviceId, deviceSecret, payload);
    return Response.json({ reminder });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not create reminder.' }, { status: 400 });
  }
}
