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

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let cachedDevices: MirAIeDevice[] = [];

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
    password: password,
    scope: scope,
  };

  if (isEmail) {
    payload.email = userId;
  } else {
    payload.mobile = userId;
  }

  const response = await fetch(`${MIRAIE_AUTH_BASE_URL}/userManagement/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Login failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.accessToken;
  tokenExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000; // 6 days

  return data as MirAIeLoginResponse;
}

/**
 * Get a valid access token (login if needed)
 */
async function getAccessToken(): Promise<string> {
  const userId = process.env.MIRAIE_USER_ID;
  const password = process.env.MIRAIE_PASSWORD;

  if (!userId || !password) {
    throw new Error('MirAIe credentials not configured');
  }

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const result = await login(userId, password);
  return result.accessToken;
}

/**
 * Fetch all homes and devices
 */
export async function fetchHomes(): Promise<MirAIeHome[]> {
  const token = await getAccessToken();

  const response = await fetch(`${MIRAIE_APP_BASE_URL}/homeManagement/homes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, retry login
      cachedToken = null;
      const newToken = await getAccessToken();
      const retryResponse = await fetch(
        `${MIRAIE_APP_BASE_URL}/homeManagement/homes`,
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        }
      );
      if (!retryResponse.ok) {
        throw new Error(`Failed to fetch homes: ${retryResponse.status}`);
      }
      return retryResponse.json();
    }
    throw new Error(`Failed to fetch homes: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all devices from all homes
 */
export async function fetchDevices(): Promise<MirAIeDevice[]> {
  const homes = await fetchHomes();
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

  cachedDevices = devices;
  return devices;
}

/**
 * Get cached devices or fetch fresh
 */
export async function getDevices(): Promise<MirAIeDevice[]> {
  if (cachedDevices.length > 0) {
    return cachedDevices;
  }
  return fetchDevices();
}

/**
 * Send a command to an AC device via MQTT
 * This is the serverless-friendly approach - connect, send, disconnect
 */
export async function sendCommand(
  deviceId: string,
  topic: string,
  command: ACCommand
): Promise<boolean> {
  const token = await getAccessToken();

  // The MirAIe platform uses MQTT for control
  // For serverless environments, we use their HTTP API as a proxy when available
  // Otherwise, the command is sent via the MQTT bridge

  const topicStr = Array.isArray(topic) ? topic[0] : topic;

  // Try HTTP API first (some MirAIe endpoints support HTTP commands)
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

    if (response.ok) {
      return true;
    }
  } catch {
    // HTTP API might not be available, fall through to MQTT
  }

  // If HTTP API doesn't work, indicate MQTT bridge is needed
  throw new Error(
    'HTTP control not available. Please use the MQTT bridge for device control.'
  );
}

/**
 * Map our command format to MirAIe MQTT payload format
 */
function mapCommandToPayload(command: ACCommand): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (command.power !== undefined) {
    payload.power = command.power ? 1 : 0;
  }
  if (command.mode !== undefined) {
    const modeMap: Record<string, number> = {
      cool: 0,
      dry: 1,
      heat: 3,
      auto: 4,
      fan: 2,
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
      low: 1,
      medium: 2,
      high: 3,
    };
    payload.fanSpeed = fanMap[command.fanSpeed] ?? 0;
  }
  if (command.verticalSwing !== undefined) {
    payload.verticalSwing = command.verticalSwing ? 1 : 0;
  }
  if (command.horizontalSwing !== undefined) {
    payload.horizontalSwing = command.horizontalSwing ? 1 : 0;
  }

  return payload;
}

/**
 * Parse device state from MQTT payload
 */
export function parseDeviceState(payload: Record<string, unknown>): Partial<ACState> {
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
    verticalSwing: (payload.verticalSwing === 1 || payload.verticalSwing === true) as boolean,
    horizontalSwing: (payload.horizontalSwing === 1 || payload.horizontalSwing === true) as boolean,
    roomTemperature: payload.roomTemperature as number | undefined,
    humidity: payload.humidity as number | undefined,
    airQuality: (payload.airQuality ?? payload.pm25 ?? 0) as number,
    online: payload.online !== false,
    lastUpdated: new Date().toISOString(),
  };
}
