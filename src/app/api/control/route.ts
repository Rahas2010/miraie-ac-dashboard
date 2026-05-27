import { NextRequest, NextResponse } from 'next/server';
import { sendCommand, fetchDevices } from '@/lib/miraie-api';
import { ACCommand } from '@/lib/types';

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

    try {
      await sendCommand(deviceId, topic, command);
      return NextResponse.json({
        success: true,
        message: 'Command sent successfully',
      });
    } catch {
      // If HTTP control fails, provide MQTT bridge instructions
      return NextResponse.json(
        {
          success: false,
          error:
            'Direct HTTP control not available. Please start the MQTT bridge for device control.',
          mqttBridgeRequired: true,
          command: {
            deviceId,
            topic,
            payload: command,
          },
        },
        { status: 503 }
      );
    }
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
