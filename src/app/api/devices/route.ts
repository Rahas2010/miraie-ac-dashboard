import { NextRequest, NextResponse } from 'next/server';
import { fetchDevices } from '@/lib/miraie-api';

/**
 * GET /api/devices - Get all MirAIe devices using token from header
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const devices = await fetchDevices(token);

    return NextResponse.json({
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        spaceName: d.spaceName,
        homeName: d.homeName,
        topic: d.topic,
        online: d.online,
      })),
      count: devices.length,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices', devices: [] },
      { status: 500 }
    );
  }
}
