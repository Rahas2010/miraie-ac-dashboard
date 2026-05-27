import { NextRequest, NextResponse } from 'next/server';
import { parseDeviceState } from '@/lib/miraie-api';
import { getCachedAuth } from '../auth/route';

// In-memory status cache
const statusCache: Map<
  string,
  {
    state: Record<string, unknown>;
    timestamp: number;
  }
> = new Map();

const STATUS_CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/status?deviceId=xxx - Get device status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json(
      { error: 'deviceId parameter is required' },
      { status: 400 }
    );
  }

  // Check cache
  const cached = statusCache.get(deviceId);
  if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
    return NextResponse.json({
      deviceId,
      state: cached.state,
      cached: true,
      age: Date.now() - cached.timestamp,
    });
  }

  // Check auth
  const auth = getCachedAuth();
  if (!auth && !process.env.MIRAIE_USER_ID) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // For status, we return cached/mock state
  // Real-time status comes via the MQTT bridge
  const mockState = {
    power: true,
    mode: 'cool',
    temperature: 24,
    fanSpeed: 'auto',
    preset: 'none',
    swingH: false,
    swingV: false,
    roomTemperature: 28,
    humidity: 65,
    online: true,
    lastUpdated: new Date().toISOString(),
  };

  // Update cache
  statusCache.set(deviceId, {
    state: mockState,
    timestamp: Date.now(),
  });

  return NextResponse.json({
    deviceId,
    state: mockState,
    cached: false,
    note: 'Connect MQTT bridge for real-time status updates',
  });
}

/**
 * POST /api/status - Update device status (from MQTT bridge)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, payload } = body;

    if (!deviceId || !payload) {
      return NextResponse.json(
        { error: 'deviceId and payload are required' },
        { status: 400 }
      );
    }

    const state = parseDeviceState(payload);

    statusCache.set(deviceId, {
      state: state as Record<string, unknown>,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
