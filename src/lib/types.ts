// ============================================================
// MirAIe AC Dashboard - Type Definitions
// CS/CU-QU26BKYFM (2025) — No nanoe-G, has PM0.1 filter
// ============================================================

// ----- MirAIe API Response Types -----

export interface MirAIeLoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface MirAIeHome {
  homeId: string;
  homeName: string;
  spaces: MirAIeSpace[];
}

export interface MirAIeSpace {
  spaceId: string;
  spaceName: string;
  devices: MirAIeDevice[];
}

export interface MirAIeDevice {
  deviceId: string;
  deviceName: string;
  deviceType?: string;
  topic: string[];
  homeId?: string;
  homeName?: string;
  spaceId?: string;
  spaceName?: string;
  firmwareVersion?: string;
  modelName?: string;
  online?: boolean;
}

// ----- AC Operation Modes -----

export type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan' | 'off';
export type FanSpeed = 'auto' | '1' | '2' | '3' | '4' | '5';

// Converti7 modes for CS/CU-QU26BKYFM
// 7-in-1: 45%, 55%, 70%, 80%, 90%, 100%, HC
export type ConvertiMode = 'off' | '45' | '55' | '70' | '80' | '90' | '100' | 'hc';

// Swing positions (0 = fixed, 1-5 = positions)
export type SwingPosition = '0' | '1' | '2' | '3' | '4' | '5';

// ----- Complete AC State -----

export interface ACState {
  // Core controls
  power: boolean;
  mode: ACMode;
  temperature: number;          // Target temperature (16-30°C)
  fanSpeed: FanSpeed;

  // Converti7
  convertiMode: ConvertiMode;

  // Swing (4-way)
  verticalSwing: boolean;
  horizontalSwing: boolean;
  verticalSwingPosition: SwingPosition;
  horizontalSwingPosition: SwingPosition;

  // Crystal Clean (self-clean mode)
  crystalClean: boolean;

  // True AI mode
  trueAI: boolean;

  // LED display on/off
  acdc: boolean;

  // Sensors
  roomTemperature: number;      // Current room temperature
  humidity: number;              // Indoor humidity %

  // Energy (via cloud polling)
  energyConsumption?: number;   // kWh
  powerUsage?: number;          // Current watts

  // Device info
  online: boolean;
  firmwareVersion?: string;
  modelName?: string;
  lastUpdated: string;
}

// ----- Command Types -----

export interface ACCommand {
  power?: boolean;
  mode?: ACMode;
  temperature?: number;
  fanSpeed?: FanSpeed;
  convertiMode?: ConvertiMode;
  verticalSwing?: boolean;
  horizontalSwing?: boolean;
  verticalSwingPosition?: SwingPosition;
  horizontalSwingPosition?: SwingPosition;
  crystalClean?: boolean;
  trueAI?: boolean;
  acdc?: boolean;
}

// ----- Schedule Types -----

export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  command: ACCommand;
  time: string;
  days: number[];
  enabled: boolean;
  label?: string;
}

// ----- Energy Types -----

export interface EnergyInsight {
  period: 'day' | 'week' | 'month';
  totalHours: number;
  estimatedKwh: number;
  estimatedCost: number;
  averageTemperature: number;
  mostUsedMode: ACMode;
  recommendations: string[];
}

// ----- Connection Types -----

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MQTTMessage {
  topic: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
