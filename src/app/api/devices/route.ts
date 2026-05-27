import { NextResponse } from 'next/server';
import { fetchDevices } from '@/lib/miraie-api';
import { getCachedAuth } from '@/lib/auth-state';

/**
 * GET /api/devices - Get all MirAIe devices
 */
export async function GET() {
  try {
    // Check if authenticated
    const auth = getCachedAuth();
    if (!auth) {
      // Try with env vars
      const userId = process.env.MIRAIE_USER_ID;
      const password = process.env.MIRAIE_PASSWORD;

      if (!userId || !password) {
        return NextResponse.json(
          { error: 'Not authenticated. Please login first.' },
          { status: 401 }
        );
      }
    }

    const devices = await fetchDevices();

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
      {
        error: error instanceof Error ? error.message : 'Failed to fetch devices',
        devices: [],
      },
      { status: 500 }
    );
  }
}
