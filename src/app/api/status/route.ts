import { NextRequest, NextResponse } from 'next/server';
import { parseDeviceState } from '@/lib/miraie-api';
import { getCachedAuth } from '@/lib/auth-state';

// In-memory status cache
const statusCache: Map<
  string,
  {
    state: Record<string, unknown>;
    timestamp: number;
  }
> = new Map();

const STATUS_CACHE_TTL = 10000; // 10 seconds

const BRIDGE_URL = process.env.NEXT_PUBLIC_MQTT_BRIDGE_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3001';

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

  // 1. Check local memory cache first
  const cached = statusCache.get(deviceId);
  if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
    return NextResponse.json({
      deviceId,
      state: cached.state,
      cached: true,
      age: Date.now() - cached.timestamp,
    });
  }

  // 2. Try to fetch real-time state from MQTT bridge if available
  try {
    const bridgeRes = await fetch(`${BRIDGE_URL}/devices`, {
      signal: AbortSignal.timeout(2000),
    });
    
    if (bridgeRes.ok) {
      const bridgeData = await bridgeRes.json();
      if (bridgeData.states && bridgeData.states[deviceId]) {
        const realState = parseDeviceState(bridgeData.states[deviceId]);
        
        statusCache.set(deviceId, {
          state: realState as Record<string, unknown>,
          timestamp: Date.now(),
        });

        return NextResponse.json({
          deviceId,
          state: realState,
          source: 'mqtt-bridge',
        });
      }
    }
  } catch (err) {
    // Bridge not available, fall back to mock or previous cache
    console.log('Bridge not available for status fetch, using fallback');
  }

  // 3. Fallback: Check auth
  const auth = getCachedAuth();
  if (!auth && !process.env.MIRAIE_USER_ID) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Final Fallback: Return mock state if nothing else works
  // In a real production app, you might want to throw an error here
  // but for this dashboard, we show a mock to keep the UI interactive.
  const mockState = {
    power: false,
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
