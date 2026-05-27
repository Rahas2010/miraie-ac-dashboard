import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_URL = process.env.NEXT_PUBLIC_MQTT_BRIDGE_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3001';

/**
 * GET /api/bridge - Proxy to MQTT bridge health/status
 */
export async function GET() {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, error: 'Bridge returned error' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ connected: true, ...data });
  } catch {
    return NextResponse.json({
      connected: false,
      error: 'MQTT bridge not reachable. Start it with: npm run mqtt-bridge',
    });
  }
}

/**
 * POST /api/bridge/control - Proxy control command to MQTT bridge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BRIDGE_URL}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'MQTT bridge not reachable. Start it with: npm run mqtt-bridge',
      },
      { status: 502 }
    );
  }
}
