/**
 * SMART HOME DASHBOARD - HARDWARE CONTROL CORE
 * Optimized for QU-Series 2025 Matter ACs
 */

import { ACCommand, MirAIeHome, MirAIeDevice } from './types';

const BASE_URL = 'https://app.miraie.in/simplifi/v1';
const AUTH_URL = 'https://auth.miraie.in/simplifi/v1';
const CLIENT_ID = 'PBcMcfG19njNCL8AOgvRzIC8AjQa';

export async function login(userId: string, password: string) {
  const isEmail = userId.includes('@');
  const response = await fetch(`${AUTH_URL}/userManagement/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'MirAIe/2.1.0' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      password,
      [isEmail ? 'email' : 'mobile']: userId,
      scope: 'openid profile offline_access'
    }),
  });
  if (!response.ok) throw new Error('Auth Failed');
  return response.json();
}

/**
 * UNBROKEN ACCESS: Use Refresh Token to get a new Access Token
 */
export async function refreshToken(token: string) {
  const response = await fetch(`${AUTH_URL}/userManagement/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'MirAIe/2.1.0' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      refreshToken: token
    }),
  });
  if (!response.ok) throw new Error('Refresh Failed');
  return response.json();
}

export async function fetchDevices(token: string): Promise<MirAIeDevice[]> {
  const response = await fetch(`${BASE_URL}/homeManagement/homes`, {
    headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'MirAIe/2.1.0' },
  });
  if (!response.ok) throw new Error('Fetch Devices Failed');
  const homes = await response.json();
  return homes.flatMap((home: any) => 
    home.spaces.flatMap((space: any) => 
      space.devices.map((device: any) => ({
        ...device,
        homeName: home.homeName,
        spaceName: space.spaceName
      }))
    )
  );
}

/**
 * CORE HARDWARE CONTROL - NO COMPROMISE
 */
export async function sendCommand(token: string, deviceId: string, topic: string, command: any): Promise<boolean> {
  const payload = mapCommandToPayload(command);
  const response = await fetch(`${BASE_URL}/deviceManagement/devices/${deviceId}/control`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json',
      'User-Agent': 'MirAIe/2.1.0'
    },
    body: JSON.stringify({
      topic: topic || `p/${deviceId}/control`,
      ...payload
    }),
  });
  return response.ok;
}

export function mapCommandToPayload(command: any) {
  const payload: any = {};
  
  if (command.power !== undefined) payload.power = command.power ? 1 : 0;
  if (command.temperature !== undefined) payload.temperature = command.temperature;
  
  if (command.mode !== undefined) {
    const modes: any = { cool: 0, dry: 1, fan: 2, heat: 3, auto: 4 };
    payload.mode = modes[command.mode] ?? 0;
  }
  
  // Powerful / AI / Eco
  if (command.preset !== undefined) {
    const presets: any = { 'none': 0, 'powerful': 1, 'eco': 2, 'ai': 3 };
    payload.presetMode = presets[command.preset] ?? 0;
  }

  // Converti 7-in-1 (QU-Series Map)
  if (command.convertiMode !== undefined) {
    const converts: any = { 'off': 0, '45': 1, '55': 2, '70': 3, '80': 4, '90': 5, '100': 6, 'hc': 7 };
    payload.convertiMode = converts[command.convertiMode] ?? 0;
  }

  // Fan Speed (0-5)
  if (command.fanSpeed !== undefined) {
    const fans: any = { 'auto': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
    payload.fanSpeed = fans[command.fanSpeed] ?? 0;
  }

  // 4-Way Swing
  if (command.verticalSwing !== undefined) payload.verticalSwing = command.verticalSwing ? 1 : 0;
  if (command.horizontalSwing !== undefined) payload.horizontalSwing = command.horizontalSwing ? 1 : 0;

  // AC Display (acdc)
  if (command.display !== undefined) payload.acdc = command.display ? 1 : 0;

  return payload;
}

export function parseDeviceState(device: any): any {
  const status = device.status || {};
  const modes: any = { 0: 'cool', 1: 'dry', 2: 'fan', 3: 'heat', 4: 'auto' };
  const presets: any = { 0: 'none', 1: 'powerful', 2: 'eco', 3: 'ai' };
  const converts: any = { 0: 'off', 1: '45', 2: '55', 3: '70', 4: '80', 5: '90', 6: '100', 7: 'hc' };
  const fans: any = { 0: 'auto', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };

  return {
    power: status.power === 1,
    mode: modes[status.mode] ?? 'cool',
    temperature: status.temperature ?? 24,
    fanSpeed: fans[status.fanSpeed] ?? 'auto',
    preset: presets[status.presetMode] ?? 'none',
    convertiMode: converts[status.convertiMode] ?? 'off',
    verticalSwing: status.verticalSwing === 1,
    horizontalSwing: status.horizontalSwing === 1,
    display: status.acdc === 1,
    roomTemperature: status.roomTemperature ?? 0,
    online: device.online !== false
  };
}
