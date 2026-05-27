'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Thermometer,
  Power,
  Wind,
  Droplets,
  Settings,
  BarChart3,
  Clock,
  Mic,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Minus,
  Snowflake,
  Flame,
  Fan,
  Gauge,
  Zap,
  Leaf,
} from 'lucide-react';

// Types
type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan' | 'off';
type FanSpeed = 'auto' | 'low' | 'medium' | 'high';
type ACPreset = 'none' | 'nanoe' | 'powerful' | 'economy';
type Tab = 'control' | 'schedule' | 'stats' | 'settings';

interface ACState {
  power: boolean;
  mode: ACMode;
  temperature: number;
  fanSpeed: FanSpeed;
  preset: ACPreset;
  swingH: boolean;
  swingV: boolean;
  roomTemperature: number;
  humidity: number;
  online: boolean;
  lastUpdated: string;
}

interface Device {
  deviceId: string;
  deviceName: string;
  spaceName: string;
}

export default function Dashboard() {
  // State
  const [activeTab, setActiveTab] = useState<Tab>('control');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [acState, setAcState] = useState<ACState>({
    power: false,
    mode: 'cool',
    temperature: 24,
    fanSpeed: 'auto',
    preset: 'none',
    swingH: false,
    swingV: false,
    roomTemperature: 28,
    humidity: 65,
    online: true,
    lastUpdated: new Date().toISOString(),
  });

  // Schedule state
  const [schedules, setSchedules] = useState<
    Array<{
      id: string;
      time: string;
      days: number[];
      command: Partial<ACState>;
      enabled: boolean;
      label: string;
    }>
  >([]);

  // Login form state
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        if (data.devices?.length > 0 && !selectedDevice) {
          setSelectedDevice(data.devices[0].deviceId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  }, [selectedDevice]);

  // Poll device status
  const pollStatus = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(`/api/status?deviceId=${selectedDevice}`);
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setAcState((prev) => ({ ...prev, ...data.state }));
        }
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  }, [selectedDevice]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated);
          if (data.authenticated) {
            fetchDevices();
          }
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [fetchDevices]);

  // Poll status every 30 seconds
  useEffect(() => {
    if (isAuthenticated && selectedDevice) {
      pollStatus();
      const interval = setInterval(pollStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedDevice, pollStatus]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        fetchDevices();
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Send AC command
  const sendCommand = async (command: Partial<ACState>) => {
    if (!selectedDevice) return;
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice,
          command,
        }),
      });

      if (res.ok) {
        setAcState((prev) => ({ ...prev, ...command }));
      } else {
        const data = await res.json();
        setError(data.error || 'Command failed');
      }
    } catch {
      setError('Failed to send command');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle power
  const togglePower = () => {
    const newPower = !acState.power;
    sendCommand({
      power: newPower,
      mode: newPower ? (acState.mode === 'off' ? 'cool' : acState.mode) : 'off',
    });
  };

  // Temperature controls
  const increaseTemp = () => {
    if (acState.temperature < 30) {
      sendCommand({ temperature: acState.temperature + 1 });
    }
  };

  const decreaseTemp = () => {
    if (acState.temperature > 16) {
      sendCommand({ temperature: acState.temperature - 1 });
    }
  };

  // Mode config
  const modes: { value: ACMode; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'cool', label: 'Cool', icon: <Snowflake size={18} />, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { value: 'heat', label: 'Heat', icon: <Flame size={18} />, color: 'text-orange-500 bg-orange-50 border-orange-200' },
    { value: 'dry', label: 'Dry', icon: <Droplets size={18} />, color: 'text-teal-500 bg-teal-50 border-teal-200' },
    { value: 'auto', label: 'Auto', icon: <Gauge size={18} />, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    { value: 'fan', label: 'Fan', icon: <Fan size={18} />, color: 'text-slate-500 bg-slate-50 border-slate-200' },
  ];

  // Fan speed config
  const fanSpeeds: { value: FanSpeed; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Med' },
    { value: 'high', label: 'High' },
  ];

  // Preset config
  const presets: { value: ACPreset; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'none', label: 'None', icon: <Minus size={16} />, desc: 'Standard mode' },
    { value: 'nanoe', label: 'Nanoe G', icon: <Leaf size={16} />, desc: 'Air purification' },
    { value: 'powerful', label: 'Powerful', icon: <Zap size={16} />, desc: 'Maximum cooling' },
    { value: 'economy', label: 'Eco', icon: <Leaf size={16} />, desc: 'Energy saving' },
  ];

  // Get gradient based on mode
  const getModeGradient = () => {
    if (!acState.power) return 'from-slate-100 to-slate-50';
    switch (acState.mode) {
      case 'cool': return 'from-blue-50 to-sky-50';
      case 'heat': return 'from-orange-50 to-amber-50';
      case 'dry': return 'from-teal-50 to-cyan-50';
      case 'auto': return 'from-purple-50 to-violet-50';
      case 'fan': return 'from-slate-100 to-gray-50';
      default: return 'from-slate-100 to-slate-50';
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-miraie-400 to-miraie-600 flex items-center justify-center animate-pulse">
            <Wind className="text-white" size={28} />
          </div>
          <p className="text-slate-500 font-medium">Loading MirAIe Dashboard...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-miraie-400 to-miraie-600 flex items-center justify-center shadow-lg shadow-miraie-500/25">
              <Wind className="text-white" size={36} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MirAIe Dashboard</h1>
            <p className="text-slate-500 mt-2">Sign in with your Panasonic MirAIe account</p>
          </div>

          <form onSubmit={handleLogin} className="glass-card p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email or Mobile
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="your@email.com or +91xxxxxxxxxx"
                value={loginForm.userId}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, userId: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Your MirAIe password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Power size={18} />
              )}
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="text-xs text-slate-400 text-center">
              Your credentials are sent directly to Panasonic's servers.
              We never store them.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-0 border-b border-slate-200/60 rounded-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-miraie-400 to-miraie-600 flex items-center justify-center">
                <Wind className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">MirAIe</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection status */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100">
                {acState.online ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-700">Online</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-red-700">Offline</span>
                  </>
                )}
              </div>

              <button onClick={pollStatus} className="btn-icon" title="Refresh">
                <RefreshCw size={18} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Device Selector */}
        {devices.length > 1 && (
          <div className="mb-6 animate-fade-in">
            <select
              className="input-field max-w-xs"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.spaceName} — {d.deviceName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit animate-fade-in">
          {[
            { id: 'control' as Tab, label: 'Control', icon: <Thermometer size={16} /> },
            { id: 'schedule' as Tab, label: 'Schedule', icon: <Clock size={16} /> },
            { id: 'stats' as Tab, label: 'Stats', icon: <BarChart3 size={16} /> },
            { id: 'settings' as Tab, label: 'Settings', icon: <Settings size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Control Tab */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
            {/* Main AC Control Card */}
            <div className="lg:col-span-2">
              <div className={`glass-card p-8 bg-gradient-to-br ${getModeGradient()} transition-all duration-500`}>
                {/* AC Visualization & Temperature */}
                <div className="text-center mb-8">
                  {/* AC Unit Visual */}
                  <div className={`mx-auto mb-6 ac-unit ${acState.power ? (acState.mode === 'heat' ? 'heating' : 'cooling') : ''}`}>
                    <div className="flex items-center justify-center h-full">
                      {acState.power ? (
                        <Wind className="text-miraie-500 animate-pulse" size={24} />
                      ) : (
                        <Wind className="text-slate-400" size={24} />
                      )}
                    </div>
                  </div>

                  {/* Temperature Display */}
                  <div className="relative inline-block">
                    <span className="text-8xl font-light text-slate-900 tracking-tighter">
                      {acState.temperature}
                    </span>
                    <span className="text-3xl font-light text-slate-400 absolute top-2 -right-8">
                      °C
                    </span>
                  </div>

                  {/* Room temperature */}
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Thermometer size={14} />
                      <span>Room: {acState.roomTemperature}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets size={14} />
                      <span>Humidity: {acState.humidity}%</span>
                    </div>
                  </div>
                </div>

                {/* Temperature Controls */}
                <div className="flex items-center justify-center gap-6 mb-8">
                  <button
                    onClick={decreaseTemp}
                    disabled={!acState.power || isSending || acState.temperature <= 16}
                    className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center 
                             text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all
                             disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Minus size={20} />
                  </button>

                  <input
                    type="range"
                    min="16"
                    max="30"
                    value={acState.temperature}
                    onChange={(e) =>
                      sendCommand({ temperature: parseInt(e.target.value) })
                    }
                    disabled={!acState.power || isSending}
                    className="temp-slider flex-1 max-w-xs"
                    style={{
                      background: `linear-gradient(to right, ${
                        acState.mode === 'heat' ? '#f97316' : '#0ea5e9'
                      } 0%, ${
                        acState.mode === 'heat' ? '#f97316' : '#0ea5e9'
                      } ${((acState.temperature - 16) / 14) * 100}%, #e2e8f0 ${
                        ((acState.temperature - 16) / 14) * 100
                      }%, #e2e8f0 100%)`,
                    }}
                  />

                  <button
                    onClick={increaseTemp}
                    disabled={!acState.power || isSending || acState.temperature >= 30}
                    className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center 
                             text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all
                             disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Power Button */}
                <div className="flex justify-center mb-8">
                  <button
                    onClick={togglePower}
                    disabled={isSending}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                      acState.power
                        ? 'bg-miraie-500 text-white shadow-lg shadow-miraie-500/30 hover:bg-miraie-600'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    } active:scale-95 disabled:opacity-50`}
                  >
                    <Power size={32} />
                  </button>
                </div>

                {/* Mode Selection */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 text-center">Mode</h3>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {modes.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => sendCommand({ mode: mode.value })}
                        disabled={!acState.power || isSending}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
                          ${
                            acState.mode === mode.value
                              ? `${mode.color} border-current shadow-sm`
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }
                          disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                      >
                        {mode.icon}
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Side Controls */}
            <div className="space-y-6">
              {/* Fan Speed */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                  <Fan size={16} />
                  Fan Speed
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {fanSpeeds.map((speed) => (
                    <button
                      key={speed.value}
                      onClick={() => sendCommand({ fanSpeed: speed.value })}
                      disabled={!acState.power || isSending}
                      className={`py-2.5 rounded-xl text-xs font-medium transition-all duration-200
                        ${
                          acState.fanSpeed === speed.value
                            ? 'bg-miraie-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }
                        disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                    >
                      {speed.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                  <Zap size={16} />
                  Presets
                </h3>
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => sendCommand({ preset: preset.value })}
                      disabled={!acState.power || isSending}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                        ${
                          acState.preset === preset.value
                            ? 'bg-miraie-50 text-miraie-700 border border-miraie-200'
                            : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'
                        }
                        disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        acState.preset === preset.value ? 'bg-miraie-100' : 'bg-slate-200'
                      }`}>
                        {preset.icon}
                      </span>
                      <div className="text-left">
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-xs text-slate-400">{preset.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Swing Controls */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Swing</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-slate-700">Horizontal</span>
                    <button
                      onClick={() => sendCommand({ swingH: !acState.swingH })}
                      disabled={!acState.power || isSending}
                      className={`toggle-switch ${acState.swingH ? 'active' : ''}`}
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-slate-700">Vertical</span>
                    <button
                      onClick={() => sendCommand({ swingV: !acState.swingV })}
                      disabled={!acState.power || isSending}
                      className={`toggle-switch ${acState.swingV ? 'active' : ''}`}
                    />
                  </label>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      sendCommand({ power: true, mode: 'cool', temperature: 22, fanSpeed: 'high' })
                    }
                    className="btn-secondary text-xs flex items-center gap-1.5 justify-center"
                  >
                    <Snowflake size={14} />
                    Quick Cool
                  </button>
                  <button
                    onClick={() =>
                      sendCommand({ power: true, mode: 'auto', temperature: 24, fanSpeed: 'auto' })
                    }
                    className="btn-secondary text-xs flex items-center gap-1.5 justify-center"
                  >
                    <Gauge size={14} />
                    Comfort
                  </button>
                  <button
                    onClick={() =>
                      sendCommand({ power: true, mode: 'cool', temperature: 26, fanSpeed: 'low', preset: 'economy' })
                    }
                    className="btn-secondary text-xs flex items-center gap-1.5 justify-center"
                  >
                    <Leaf size={14} />
                    Sleep
                  </button>
                  <button
                    onClick={() => sendCommand({ power: false, mode: 'off' })}
                    className="btn-secondary text-xs flex items-center gap-1.5 justify-center text-red-600 hover:bg-red-50"
                  >
                    <Power size={14} />
                    Turn Off
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="glass-card p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Schedules</h2>
              <button
                onClick={() => {
                  setSchedules((prev) => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      time: '08:00',
                      days: [1, 2, 3, 4, 5],
                      command: { power: true, mode: 'cool', temperature: 24 },
                      enabled: true,
                      label: 'New Schedule',
                    },
                  ]);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                Add Schedule
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-slate-500">No schedules yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Create a schedule to automate your AC
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                  >
                    <button
                      onClick={() =>
                        setSchedules((prev) =>
                          prev.map((s) =>
                            s.id === schedule.id
                              ? { ...s, enabled: !s.enabled }
                              : s
                          )
                        )
                      }
                      className={`toggle-switch ${schedule.enabled ? 'active' : ''}`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-slate-900">
                        {schedule.time}
                      </div>
                      <div className="text-sm text-slate-500">
                        {schedule.label} • {schedule.command.temperature}°C •{' '}
                        {schedule.command.mode}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setSchedules((prev) =>
                          prev.filter((s) => s.id !== schedule.id)
                        )
                      }
                      className="btn-icon text-red-500 hover:bg-red-50"
                    >
                      <Minus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
              <div className="stat-card">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Clock size={16} />
                  Runtime Today
                </div>
                <div className="text-3xl font-semibold text-slate-900">4.5h</div>
                <div className="text-xs text-emerald-600">↓ 12% vs yesterday</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Zap size={16} />
                  Est. Energy
                </div>
                <div className="text-3xl font-semibold text-slate-900">3.2 kWh</div>
                <div className="text-xs text-slate-500">≈ ₹25.60 today</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Thermometer size={16} />
                  Avg Temperature
                </div>
                <div className="text-3xl font-semibold text-slate-900">23.5°C</div>
                <div className="text-xs text-slate-500">Set: 24°C avg</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Wind size={16} />
                  Most Used Mode
                </div>
                <div className="text-3xl font-semibold text-slate-900">Cool</div>
                <div className="text-xs text-slate-500">68% of runtime</div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Usage History</h3>
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Usage charts will appear here</p>
                  <p className="text-sm">Data is collected over time</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Energy Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <Leaf className="text-blue-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Eco Tip</p>
                    <p className="text-sm text-blue-700">
                      Setting your AC to 24°C instead of 22°C can save up to 15% on energy.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                  <Zap className="text-amber-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Peak Usage</p>
                    <p className="text-sm text-amber-700">
                      Your highest usage is between 2PM - 6PM. Consider pre-cooling during off-peak hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="glass-card p-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Settings</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Connection</h3>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {acState.online ? (
                        <Wifi className="text-emerald-500" size={20} />
                      ) : (
                        <WifiOff className="text-red-500" size={20} />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">
                          {acState.online ? 'Connected' : 'Disconnected'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Last updated:{' '}
                          {acState.lastUpdated
                            ? new Date(acState.lastUpdated).toLocaleTimeString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                    <button onClick={pollStatus} className="btn-secondary text-sm">
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Voice Control</h3>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mic className="text-slate-600" size={20} />
                      <div>
                        <p className="font-medium text-slate-900">Voice Commands</p>
                        <p className="text-xs text-slate-500">
                          Control your AC with voice (browser support required)
                        </p>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm flex items-center gap-1.5">
                      <Mic size={14} />
                      Enable
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Account</h3>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <button
                    onClick={() => {
                      setIsAuthenticated(false);
                      setDevices([]);
                    }}
                    className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="glass-card p-4 border-red-200 bg-red-50 flex items-center gap-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Sending overlay */}
        {isSending && (
          <div className="fixed inset-0 bg-black/5 pointer-events-none z-40 flex items-center justify-center">
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <RefreshCw className="animate-spin text-miraie-500" size={16} />
              <span className="text-sm text-slate-600">Sending...</span>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-0 border-t border-slate-200/60 rounded-none">
        <div className="flex items-center justify-around h-16">
          {[
            { id: 'control' as Tab, icon: <Thermometer size={20} />, label: 'Control' },
            { id: 'schedule' as Tab, icon: <Clock size={20} />, label: 'Schedule' },
            { id: 'stats' as Tab, icon: <BarChart3 size={20} />, label: 'Stats' },
            { id: 'settings' as Tab, icon: <Settings size={20} />, label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-miraie-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
