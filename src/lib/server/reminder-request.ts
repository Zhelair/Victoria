import { headers } from 'next/headers';

export function readReminderDeviceHeaders() {
  const requestHeaders = headers();
  const deviceId = requestHeaders.get('x-victoria-reminder-device');
  const deviceSecret = requestHeaders.get('x-victoria-reminder-secret');

  if (!deviceId || !deviceSecret) {
    throw new Error('Missing reminder device credentials.');
  }

  return { deviceId, deviceSecret };
}
