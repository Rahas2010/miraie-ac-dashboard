// ============================================================
// MirAIe AC Dashboard - Complete Type Definitions
// Covers ALL data points exposed by MirAIe MQTT & HTTP API
// ============================================================

// ----- MirAIe API Response Types -----

export interface MirAIeLoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface MirAIeHome {
  homeId: string;
  homeName: string;
  homeType?: string;
  spaces: MirAIeSpace[];
}

export interface MirAIeSpace {
  spaceId: string;
  spaceName: string;
  spaceType?: string;
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
  brand?: string;
  online?: boolean;
}

// ----- AC Operation Modes -----

export type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan' | 'off';

export type FanSpeed = 'auto' | '1' | '2' | '3' | '4' | '5';

export type ACPreset = 'none' | 'nanoe' | 'powerful' | 'economy' | 'clean';

// MirAIe Converti7 modes (powerful mode levels)
export type ConvertiMode =
  | 'off'
  | '40'
  | '55'
  | '70'
  | '80'
  | '90'
  | '100'
  | 'fc'  // Fast Cooling
  | 'hc'  // High Capacity
  | 'ns'; // Not Set

// Swing positions (0-5, where 0 is fixed position)
export type SwingPosition = '0' | '1' | '2' | '3' | '4' | '5';

// ----- Air Quality -----

export type AirQualityLevel = 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export interface AirQualityData {
  pm25: number;        // PM2.5 in µg/m³
  pm10?: number;       // PM10 in µg/m³
  level: AirQualityLevel;
  levelLabel: string;
  color: string;
}

// ----- Complete AC State (ALL MirAIe data points) -----

export interface ACState {
  // Core controls
  power: boolean;
  mode: ACMode;
  temperature: number;         // Target temperature (16-30°C)
  fanSpeed: FanSpeed;

  // Preset & special modes
  preset: ACPreset;
  convertiMode: ConvertiMode;

  // Swing
  verticalSwing: boolean;
  horizontalSwing: boolean;

  // Nanoe™ technology
  nanoeG: boolean;

  // LED display
  acdc: boolean;              // AC display on/off

  // Sensors
  roomTemperature: number;    // Current room temperature
  humidity: number;           // Indoor humidity %
  airQuality: number; // PM2.5 µg/m³

  // Energy
  energyConsumption?: number; // kWh (if available via cloud polling)
  powerUsage?: number;       // Current watts

  // Device info
  online: boolean;
  firmwareVersion?: string;
  modelName?: string;

  // Timestamps
  lastUpdated: string;
  lastModeChange?: string;
  lastTemperatureChange?: string;
}

// ----- Command Types -----

export interface ACCommand {
  power?: boolean;
  mode?: ACMode;
  temperature?: number;
  fanSpeed?: FanSpeed;
  preset?: ACPreset;
  convertiMode?: ConvertiMode;
  verticalSwing?: boolean;
  horizontalSwing?: boolean;
  nanoeG?: boolean;
  acdc?: boolean;
}

// ----- Schedule Types -----

export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  command: ACCommand;
  time: string;      // HH:mm format
  days: number[];    // 0-6 (Sun-Sat)
  enabled: boolean;
  label?: string;
}

// ----- Usage & Energy Types -----

export interface UsageRecord {
  timestamp: string;
  temperature: number;
  roomTemperature: number;
  mode: ACMode;
  power: boolean;
  duration?: number;
}

export interface DailyUsage {
  date: string;
  totalHours: number;
  averageTemp: number;
  modes: Record<ACMode, number>;
}

export interface EnergyInsight {
  period: 'day' | 'week' | 'month';
  totalHours: number;
  estimatedKwh: number;
  estimatedCost: number;
  averageTemperature: number;
  mostUsedMode: ACMode;
  recommendations: string[];
}

// ----- Automation Types -----

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AutomationTrigger {
  type: 'temperature' | 'time' | 'humidity' | 'air_quality' | 'manual';
  value: number | string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
}

export interface AutomationCondition {
  type: 'temperature' | 'time' | 'mode' | 'power' | 'humidity';
  value: number | string | boolean;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
}

export interface AutomationAction {
  deviceId: string;
  command: ACCommand;
  delay?: number;
}

// ----- Connection Types -----

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MQTTMessage {
  topic: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
