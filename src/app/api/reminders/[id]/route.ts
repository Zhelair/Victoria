import { NextRequest } from 'next/server';
import type { ReminderRecordPayload } from '@/lib/reminders';
import {
  deleteReminderRow,
  isReminderBackendConfigured,
  updateReminderRow,
} from '@/lib/server/reminders';

export const runtime = 'nodejs';

function readDeviceHeaders(req: NextRequest) {
  const deviceId = req.headers.get('x-victoria-reminder-device');
  const deviceSecret = req.headers.get('x-victoria-reminder-secret');
  if (!deviceId || !deviceSecret) {
    throw new Error('Missing reminder device credentials.');
  }
  return { deviceId, deviceSecret };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isReminderBackendConfigured()) {
    return Response.json(
      { error: 'Reminder backend is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const { deviceId, deviceSecret } = readDeviceHeaders(req);
    const payload = (await req.json()) as ReminderRecordPayload & { active?: boolean };
    const reminder = await updateReminderRow(deviceId, deviceSecret, params.id, payload);
    return Response.json({ reminder });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not update reminder.' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isReminderBackendConfigured()) {
    return Response.json(
      { error: 'Reminder backend is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const { deviceId, deviceSecret } = readDeviceHeaders(req);
    await deleteReminderRow(deviceId, deviceSecret, params.id);
    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Could not delete reminder.' }, { status: 400 });
  }
}
