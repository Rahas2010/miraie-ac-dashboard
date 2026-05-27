import { NextRequest, NextResponse } from 'next/server';
import { fetchDevices, parseDeviceState, fetchEnergyData } from '@/lib/miraie-api';

const statusCache: Map<string, { state: any; timestamp: number }> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!deviceId || !token) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  try {
    // 1. Fetch live devices to get real-time state from the homes payload
    const rawDevices = await fetchDevices(token);
    const rawDevice = rawDevices.find(d => d.deviceId === deviceId);
    
    if (!rawDevice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 2. Parse the real state from the device payload
    // MirAIe QU-series devices include state in the 'status' or 'rawStatus' field
    const state = parseDeviceState(rawDevice as any);

    // 3. Fetch Real Energy Data
    try {
       const energy = await fetchEnergyData(token, deviceId);
       if (energy && energy.today) {
         state.energyToday = energy.today;
       }
    } catch (e) {
       console.log('Energy fetch failed');
       state.energyToday = 0;
    }

    return NextResponse.json({ deviceId, state });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
