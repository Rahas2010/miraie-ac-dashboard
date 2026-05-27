import { NextRequest, NextResponse } from 'next/server';
import { fetchDevices, parseDeviceState } from '@/lib/miraie-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!deviceId || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rawDevices = await fetchDevices(token);
    const rawDevice = rawDevices.find(d => d.deviceId === deviceId);
    
    if (!rawDevice || !rawDevice.status) {
      return NextResponse.json({ error: 'AC status currently unavailable' }, { status: 503 });
    }

    const state = parseDeviceState(rawDevice);
    // Energy telemetry removed as requested
    return NextResponse.json({ deviceId, state });
  } catch (error) {
    return NextResponse.json({ error: 'Connection to Panasonic failed' }, { status: 500 });
  }
}
