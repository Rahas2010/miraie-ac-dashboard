/**
 * SMART HOME DASHBOARD - ADVANCED API CLIENT
 * Specifically tuned for QU-Series (2025 Matter Models)
 */

import { ACCommand } from './types';

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
 * Fetch Energy Consumption (Electricity Chart Data)
 */
export async function fetchEnergyData(token: string, deviceId: string) {
  const response = await fetch(`${BASE_URL}/deviceManagement/devices/${deviceId}/energy`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json(); // Returns day/month/year consumption
}

/**
 * Map Commands specifically for 2025 Matter ACs
 */
export function mapCommandToPayload(command: any) {
  const payload: any = {};
  
  // Power & Basic Modes
  if (command.power !== undefined) payload.power = command.power ? 1 : 0;
  if (command.temperature !== undefined) payload.temperature = command.temperature;
  
  // Advanced Modes (Powerful, Eco, AI)
  if (command.preset !== undefined) {
    const presetMap: any = { 'none': 0, 'powerful': 1, 'eco': 2, 'ai': 3 };
    payload.presetMode = presetMap[command.preset] ?? 0;
  }

  // Converti7 (7-in-1 Cooling)
  if (command.convertiMode !== undefined) {
    const convertMap: any = { 'off': 0, '40': 1, '55': 2, '70': 3, '80': 4, '90': 5, '100': 6, 'fc': 7, 'hc': 8 };
    payload.convertiMode = convertMap[command.convertiMode] ?? 0;
  }

  return payload;
}
