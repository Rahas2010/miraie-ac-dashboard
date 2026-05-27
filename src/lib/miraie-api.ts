/**
 * Panasonic MirAIe API Client
 * Handles authentication, device management, and AC control
 */

import {
  MirAIeLoginResponse,
  MirAIeHome,
  MirAIeDevice,
  ACState,
  ACCommand,
} from './types';

const MIRAIE_AUTH_BASE_URL = 'https://auth.miraie.in/simplifi/v1';
const MIRAIE_APP_BASE_URL = 'https://app.miraie.in/simplifi/v1';
const MIRAIE_CLIENT_ID = 'PBcMcfG19njNCL8AOgvRzIC8AjQa';

/**
 * Authenticate with MirAIe API
 */
export async function login(
  userId: string,
  password: string
): Promise<MirAIeLoginResponse> {
  const isEmail = userId.includes('@');
  const scope = `an_${Math.floor(Math.random() * 999999999)}`;

  const payload: Record<string, string> = {
    clientId: MIRAIE_CLIENT_ID,
    password,
    scope,
  };

  if (isEmail) {
    payload.email = userId;
  } else {
    payload.mobile = userId;
  }

  console.log(`[MirAIe] Logging in as ${userId}...`);

  const response = await fetch(`${MIRAIE_AUTH_BASE_URL}/userManagement/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MirAIe] Login failed: ${response.status} - ${errorText}`);
    throw new Error(`Login failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[MirAIe] Login successful');
  return data as MirAIeLoginResponse;
}

/**
 * Fetch all homes and devices using a provided token
 */
export async function fetchHomes(token: string): Promise<MirAIeHome[]> {
  console.log('[MirAIe] Fetching homes...');

  const response = await fetch(`${MIRAIE_APP_BASE_URL}/homeManagement/homes`, {
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
  const topicStr = Array.isArray(topic) ? topic[0] : topic;

  try {
    const response = await fetch(
      `${MIRAIE_APP_BASE_URL}/deviceManagement/devices/${deviceId}/control`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topicStr,
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
 * Map command to MirAIe MQTT payload format
 */
export function mapCommandToPayload(
  command: ACCommand
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (command.power !== undefined) {
    payload.power = command.power ? 1 : 0;
  }
  if (command.mode !== undefined) {
    const modeMap: Record<string, number> = {
      cool: 0,
      dry: 1,
      fan: 2,
      heat: 3,
      auto: 4,
      off: 0,
    };
    payload.mode = modeMap[command.mode] ?? 0;
  }
  if (command.temperature !== undefined) {
    payload.temperature = command.temperature;
  }
  if (command.fanSpeed !== undefined) {
    const fanMap: Record<string, number> = {
      auto: 0,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
    };
    payload.fanSpeed = fanMap[command.fanSpeed] ?? 0;
  }
  if (command.verticalSwingPosition !== undefined) {
    payload.verticalSwing = parseInt(command.verticalSwingPosition);
  }
  if (command.horizontalSwingPosition !== undefined) {
    payload.horizontalSwing = parseInt(command.horizontalSwingPosition);
  }
  if (command.crystalClean !== undefined) {
    payload.crystalClean = command.crystalClean ? 1 : 0;
  }
  if (command.acdc !== undefined) {
    payload.acdc = command.acdc ? 1 : 0;
  }

  return payload;
}

/**
 * Parse device state from MQTT payload
 */
export function parseDeviceState(
  payload: Record<string, unknown>
): Partial<ACState> {
  const modeMap: Record<number, ACState['mode']> = {
    0: 'cool',
    1: 'dry',
    2: 'fan',
    3: 'heat',
    4: 'auto',
  };

  const fanMap: Record<number, ACState['fanSpeed']> = {
    0: 'auto',
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
  };

  return {
    power: payload.power === 1 || payload.power === true,
    mode: modeMap[payload.mode as number] ?? 'auto',
    temperature: (payload.temperature as number) ?? 24,
    fanSpeed: fanMap[payload.fanSpeed as number] ?? 'auto',
    roomTemperature: (payload.roomTemperature as number) ?? 0,
    humidity: (payload.humidity as number) ?? 0,
    verticalSwing: (payload.verticalSwing as number) > 0 || payload.verticalSwing === true,
    horizontalSwing: (payload.horizontalSwing as number) > 0 || payload.horizontalSwing === true,
    crystalClean: payload.crystalClean === 1 || payload.crystalClean === true,
    acdc: payload.acdc !== undefined ? (payload.acdc === 1 || payload.acdc === true) : true,
    online: payload.online !== false,
    lastUpdated: new Date().toISOString(),
  } as Partial<ACState>;
}
