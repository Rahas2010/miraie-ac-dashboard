import { NextRequest, NextResponse } from 'next/server';
import { fetchDevices, parseDeviceState, fetchEnergyData } from '@/lib/miraie-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!deviceId || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Fetch REAL data from Panasonic
    const rawDevices = await fetchDevices(token);
    const rawDevice = rawDevices.find(d => d.deviceId === deviceId);
    
    if (!rawDevice || !rawDevice.status) {
      // If no status is returned, we return an error. NO MORE MOCK DATA.
      return NextResponse.json({ error: 'AC status currently unavailable from Panasonic servers' }, { status: 503 });
    }

    const state = parseDeviceState(rawDevice);

    // Fetch REAL energy
    try {
       const energy = await fetchEnergyData(token, deviceId);
       state.energyToday = energy?.today || 0;
    } catch (e) {
       state.energyToday = 0;
    }

    return NextResponse.json({ deviceId, state });
  } catch (error) {
    return NextResponse.json({ error: 'Connection to Panasonic failed' }, { status: 500 });
  }
}
