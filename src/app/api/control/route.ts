import { NextRequest, NextResponse } from 'next/server';
import { fetchDevices, sendCommand } from '@/lib/miraie-api';
import { ACCommand } from '@/lib/types';

/**
 * POST /api/control - Send a command using token from header
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, command } = body as {
      deviceId: string;
      command: ACCommand;
    };

    const devices = await fetchDevices(token);
    const device = devices.find((d) => d.deviceId === deviceId);

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const topic = Array.isArray(device.topic) ? device.topic[0] : device.topic;
    const success = await sendCommand(token, deviceId, topic, command);

    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: 'Command failed' }, { status: 500 });
  }
}
