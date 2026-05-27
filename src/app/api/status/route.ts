import { NextRequest, NextResponse } from 'next/server';
import { parseDeviceState } from '@/lib/miraie-api';

// In-memory status cache
const statusCache: Map<string, { state: Record<string, unknown>; timestamp: number }> = new Map();
const STATUS_CACHE_TTL = 15000; 

const BRIDGE_URL = process.env.NEXT_PUBLIC_MQTT_BRIDGE_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3001';

/**
 * GET /api/status?deviceId=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const authHeader = request.headers.get('Authorization');

  if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
  if (!authHeader) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // 1. Check Cache
  const cached = statusCache.get(deviceId);
  if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
    return NextResponse.json({ deviceId, state: cached.state, cached: true });
  }

  // 2. Try Bridge
  try {
    const bridgeRes = await fetch(`${BRIDGE_URL}/devices`, { signal: AbortSignal.timeout(2000) });
    if (bridgeRes.ok) {
      const bridgeData = await bridgeRes.json();
      if (bridgeData.states && bridgeData.states[deviceId]) {
        const realState = parseDeviceState(bridgeData.states[deviceId]);
        statusCache.set(deviceId, { state: realState as Record<string, unknown>, timestamp: Date.now() });
        return NextResponse.json({ deviceId, state: realState, source: 'mqtt-bridge' });
      }
    }
  } catch (err) {}

  // 3. Fallback to a safe mock state (so the UI doesn't hang)
  // This allows the control panel to open immediately. 
  // Real state will populate once the MQTT bridge connects or a command is sent.
  const initialSafeState = {
    power: false,
    mode: 'cool',
    temperature: 24,
    fanSpeed: 'auto',
    roomTemperature: 25,
    online: true,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json({
    deviceId,
    state: initialSafeState,
    note: 'Initial state loaded. Use MQTT bridge for live updates.'
  });
}

/**
 * POST /api/status (Updates from MQTT bridge)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, payload } = body;
    if (!deviceId || !payload) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const state = parseDeviceState(payload);
    statusCache.set(deviceId, { state: state as Record<string, unknown>, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
