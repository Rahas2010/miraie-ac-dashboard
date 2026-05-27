// MirAIe API Types
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
  online?: boolean;
}

// AC State Types
export type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan' | 'off';
export type FanSpeed = 'auto' | 'low' | 'medium' | 'high';
export type ACPreset = 'none' | 'nanoe' | 'powerful' | 'economy' | 'clean';

export interface ACState {
  power: boolean;
  mode: ACMode;
  temperature: number;
  fanSpeed: FanSpeed;
  preset: ACPreset;
  swingH: boolean;
  swingV: boolean;
  nanoeG: boolean;
  powerfulMode: boolean;
  economyMode: boolean;
  roomTemperature?: number;
  humidity?: number;
  lastUpdated?: string;
  online: boolean;
}

export interface ACCommand {
  power?: boolean;
  mode?: ACMode;
  temperature?: number;
  fanSpeed?: FanSpeed;
  preset?: ACPreset;
  swingH?: boolean;
  swingV?: boolean;
  nanoeG?: boolean;
  powerfulMode?: boolean;
  economyMode?: boolean;
}

// Schedule Types
export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  command: ACCommand;
  time: string; // HH:mm format
  days: number[]; // 0-6 (Sun-Sat)
  enabled: boolean;
  label?: string;
}

// Usage Stats Types
export interface UsageRecord {
  timestamp: string;
  temperature: number;
  roomTemperature: number;
  mode: ACMode;
  power: boolean;
  duration?: number; // minutes
}

export interface DailyUsage {
  date: string;
  totalHours: number;
  averageTemp: number;
  modes: Record<ACMode, number>; // hours per mode
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

// WebSocket/MQTT Types
export interface MQTTMessage {
  topic: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// UI Types
export interface DeviceCardProps {
  device: MirAIeDevice;
  state: ACState | null;
  onCommand: (deviceId: string, command: ACCommand) => void;
  onSelect: (deviceId: string) => void;
  isSelected: boolean;
}

// Automation Rule Types
export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AutomationTrigger {
  type: 'temperature' | 'time' | 'manual' | 'presence';
  value: number | string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
}

export interface AutomationCondition {
  type: 'temperature' | 'time' | 'mode' | 'power';
  value: number | string | boolean;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
}

export interface AutomationAction {
  deviceId: string;
  command: ACCommand;
  delay?: number; // seconds
}
