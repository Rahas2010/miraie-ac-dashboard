import { NextRequest, NextResponse } from 'next/server';
import { fetchDevices } from '@/lib/miraie-api';
import { ACCommand } from '@/lib/types';
import { sendCommand } from '@/lib/miraie-api';

const BRIDGE_URL = process.env.NEXT_PUBLIC_MQTT_BRIDGE_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3001';

/**
 * POST /api/control - Send a command to an AC device
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, command } = body as {
      deviceId: string;
      command: ACCommand;
    };

    if (!deviceId || !command) {
      return NextResponse.json(
        { error: 'deviceId and command are required' },
        { status: 400 }
      );
    }

    // Find the device to get its topic
    const devices = await fetchDevices();
    const device = devices.find((d) => d.deviceId === deviceId);

    if (!device) {
      return NextResponse.json(
        { error: `Device ${deviceId} not found` },
        { status: 404 }
      );
    }

    const topic = Array.isArray(device.topic) ? device.topic[0] : device.topic;

    // 1. Try Direct HTTP Control (Fastest)
    try {
      const success = await sendCommand(deviceId, topic, command);
      if (success) {
        return NextResponse.json({
          success: true,
          method: 'http',
          message: 'Command sent successfully via HTTP',
        });
      }
    } catch (err) {
      console.log('HTTP control failed, trying MQTT bridge...');
    }

    // 2. Try MQTT Bridge Control (Fallback)
    try {
      const bridgeRes = await fetch(`${BRIDGE_URL}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command }),
        signal: AbortSignal.timeout(5000),
      });

      if (bridgeRes.ok) {
        return NextResponse.json({
          success: true,
          method: 'mqtt-bridge',
          message: 'Command sent successfully via MQTT bridge',
        });
      }
    } catch (err) {
      console.log('MQTT bridge control failed');
    }

    // 3. Both failed
    return NextResponse.json(
      {
        success: false,
        error: 'Control failed. Ensure your AC is online and the MQTT bridge is running.',
        mqttBridgeRequired: true,
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('Control error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Command failed',
      },
      { status: 500 }
    );
  }
}
