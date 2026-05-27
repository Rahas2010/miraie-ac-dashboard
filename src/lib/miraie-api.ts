/**
 * SMART HOME DASHBOARD - ADVANCED API CLIENT
 * Specifically tuned for QU-Series (2025 Matter Models)
 */

import { ACCommand, MirAIeHome, MirAIeDevice } from './types';

const BASE_URL = 'https://app.miraie.in/simplifi/v1';
const AUTH_URL = 'https://auth.miraie.in/simplifi/v1';

export async function login(userId: string, password: string) {
  const isEmail = userId.includes('@');
  const response = await fetch(`${AUTH_URL}/userManagement/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'PBcMcfG19njNCL8AOgvRzIC8AjQa',
      password,
      [isEmail ? 'email' : 'mobile']: userId,
      scope: `an_${Math.floor(Math.random() * 999999)}`
    }),
  });

  if (!response.ok) throw new Error('Invalid Panasonic ID or Password');
  return response.json();
}

/**
 * Fetch all homes using a provided token
 */
export async function fetchHomes(token: string): Promise<MirAIeHome[]> {
  const response = await fetch(`${BASE_URL}/homeManagement/homes`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch homes: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all devices using a provided token
 */
export async function fetchDevices(token: string): Promise<MirAIeDevice[]> {
  const homes = await fetchHomes(token);
  const devices: MirAIeDevice[] = [];

  for (const home of homes) {
    for (const space of home.spaces || []) {
      for (const device of space.devices || []) {
        devices.push({
          ...device,
          homeId: home.homeId,
          homeName: home.homeName,
          spaceId: space.spaceId,
          spaceName: space.spaceName,
        });
      }
    }
  }

  return devices;
}

/**
 * Send command to device
 */
export async function sendCommand(
  token: string,
  deviceId: string,
  topic: string,
  command: ACCommand
): Promise<boolean> {
  try {
    const response = await fetch(
      `${BASE_URL}/deviceManagement/devices/${deviceId}/control`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: Array.isArray(topic) ? topic[0] : topic,
          ...mapCommandToPayload(command),
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.log('[MirAIe] HTTP control failed:', error);
    return false;
  }
}

/**
 * Fetch Energy Consumption (Electricity Chart Data)
 */
export async function fetchEnergyData(token: string, deviceId: string) {
  const response = await fetch(`${BASE_URL}/deviceManagement/devices/${deviceId}/energy`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json();
}

/**
 * Map Commands specifically for 2025 Matter ACs
 */
export function mapCommandToPayload(command: any) {
  const payload: any = {};
  
  if (command.power !== undefined) payload.power = command.power ? 1 : 0;
  if (command.temperature !== undefined) payload.temperature = command.temperature;
  if (command.mode !== undefined) {
    const modes: any = { cool: 0, dry: 1, fan: 2, heat: 3, auto: 4 };
    payload.mode = modes[command.mode] ?? 0;
  }
  
  if (command.preset !== undefined) {
    const presetMap: any = { 'none': 0, 'powerful': 1, 'eco': 2, 'ai': 3 };
    payload.presetMode = presetMap[command.preset] ?? 0;
  }

  // Converti7 (Official QU-Series Mapping)
  if (command.convertiMode !== undefined) {
    const convertMap: any = { 
      'off': 0, 
      '40': 1, 
      '55': 2, 
      '70': 3, 
      '80': 4, 
      '90': 5, 
      '100': 6, 
      'hc': 7 
    };
    payload.convertiMode = convertMap[command.convertiMode] ?? 0;
  }

  if (command.fanSpeed !== undefined) {
    const fanMap: any = { 'auto': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
    payload.fanSpeed = fanMap[command.fanSpeed] ?? 0;
  }

  return payload;
}

/**
 * Parse Device State for QU-Series
 */
export function parseDeviceState(device: any): any {
  const status = device.status || {};
  
  const modes: any = { 0: 'cool', 1: 'dry', 2: 'fan', 3: 'heat', 4: 'auto' };
  const presets: any = { 0: 'none', 1: 'powerful', 2: 'eco', 3: 'ai' };
  const converts: any = { 0: 'off', 1: '40', 2: '55', 3: '70', 4: '80', 5: '90', 6: '100', 7: 'hc' };
  const fanSpeeds: any = { 0: 'auto', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };

  return {
    power: status.power === 1,
    mode: modes[status.mode] ?? 'cool',
    temperature: status.temperature ?? 24,
    fanSpeed: fanSpeeds[status.fanSpeed] ?? 'auto',
    preset: presets[status.presetMode] ?? 'none',
    convertiMode: converts[status.convertiMode] ?? 'off',
    roomTemperature: status.roomTemperature ?? 0,
    humidity: status.humidity ?? 0,
    online: device.online !== false,
    lastUpdated: new Date().toISOString(),
  };
}
