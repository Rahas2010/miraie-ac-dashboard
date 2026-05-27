'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Thermometer, Power, Wind, Droplets, Settings, BarChart3,
  Clock, Mic, Wifi, WifiOff, RefreshCw, Plus, Minus,
  Snowflake, Flame, Fan, Gauge, Zap, Leaf, Sun, Moon,
  ChevronDown, ChevronUp, Activity, Shield, Eye, EyeOff,
  Timer, Play, Pause, Trash2, Edit3, Volume2
} from 'lucide-react';

// ========== TYPES ==========
type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan' | 'off';
type FanSpeed = 'auto' | '1' | '2' | '3' | '4' | '5';
type ACPreset = 'none' | 'nanoe' | 'powerful' | 'economy' | 'clean' | 'sleep' | 'comfort';
type ConvertiMode = 'off' | '40' | '55' | '70' | '80' | '90' | '100' | 'fc' | 'hc';
type Tab = 'control' | 'schedule' | 'stats' | 'settings';

interface ACState {
  power: boolean;
  mode: ACMode;
  temperature: number;
  fanSpeed: FanSpeed;
  preset: ACPreset;
  convertiMode: ConvertiMode;
  verticalSwing: boolean;
  horizontalSwing: boolean;
  nanoeG: boolean;
  acdc: boolean;
  roomTemperature: number;
  humidity: number;
  airQuality: number;
  online: boolean;
  lastUpdated: string;
  firmwareVersion?: string;
  modelName?: string;
}

interface Device {
  deviceId: string;
  deviceName: string;
  spaceName: string;
}

// ========== MAIN PAGE ==========
export default function Dashboard() {
  // State
  const [activeTab, setActiveTab] = useState<Tab>('control');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [showConverti, setShowConverti] = useState(false);
  const [showFanSlider, setShowFanSlider] = useState(false);
  const fanSliderRef = useRef<HTMLDivElement>(null);

  const [acState, setAcState] = useState<ACState>({
    power: false,
    mode: 'cool',
    temperature: 26,
    fanSpeed: '3',
    preset: 'none',
    convertiMode: 'off',
    verticalSwing: false,
    horizontalSwing: false,
    nanoeG: false,
    acdc: true,
    roomTemperature: 25,
    humidity: 65,
    airQuality: 97,
    online: true,
    lastUpdated: new Date().toISOString(),
    firmwareVersion: 'v2.1.3',
    modelName: 'CS/CU-PU18VKY',
  });

  // Close fan slider when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fanSliderRef.current && !fanSliderRef.current.contains(event.target as Node)) {
        setShowFanSlider(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated);
          if (data.authenticated) fetchDevices();
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [fetchDevices]);

  // Poll every 30s
  useEffect(() => {
    if (isAuthenticated && selectedDevice) {
      pollStatus();
      const interval = setInterval(pollStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedDevice, pollStatus]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: (e.target as HTMLFormElement).userId.value, password: (e.target as HTMLFormElement).password.value }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchDevices();
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Send command
  const sendCommand = async (command: Partial<ACState>) => {
    if (!selectedDevice) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDevice, command }),
      });
      if (res.ok) {
        setAcState((prev) => ({ ...prev, ...command }));
      }
    } catch {
      setError('Failed to send command');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle power
  const togglePower = () => {
    if (acState.power) {
      sendCommand({ power: false, mode: 'off' });
    } else {
      sendCommand({ power: true, mode: acState.mode === 'off' ? 'cool' : acState.mode });
    }
  };

  // Helpers
  const getAirQualityLabel = (pm25: number) => {
    if (pm25 <= 12) return { label: 'Good', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (pm25 <= 35) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    if (pm25 <= 55) return { label: 'Unhealthy for Sensitive', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (pm25 <= 150) return { label: 'Unhealthy', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    return { label: 'Very Unhealthy', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
  };

  const getModeIcon = (mode: ACMode) => {
    switch (mode) {
      case 'cool': return <Snowflake size={18} />;
      case 'heat': return <Flame size={18} />;
      case 'dry': return <Droplets size={18} />;
      case 'auto': return <Gauge size={18} />;
      case 'fan': return <Fan size={18} />;
      default: return <Wind size={18} />;
    }
  };

  const getModeColor = (mode: ACMode) => {
    switch (mode) {
      case 'cool': return 'from-blue-500 to-sky-400';
      case 'heat': return 'from-orange-500 to-amber-400';
      case 'dry': return 'from-teal-500 to-cyan-400';
      case 'auto': return 'from-purple-500 to-violet-400';
      case 'fan': return 'from-slate-500 to-gray-400';
      default: return 'from-slate-400 to-slate-300';
    }
  };

  const convertiOptions: { value: ConvertiMode; label: string }[] = [
    { value: 'off', label: 'Off' },
    { value: '40', label: '40%' },
    { value: '55', label: '55%' },
    { value: '70', label: '70%' },
    { value: '80', label: '80%' },
    { value: '90', label: '90%' },
    { value: '100', label: '100%' },
    { value: 'fc', label: 'FC' },
    { value: 'hc', label: 'HC' },
  ];

  // ========== LOADING ==========
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-miraie-400 to-miraie-600 flex items-center justify-center animate-pulse">
            <Wind className="text-white" size={28} />
          </div>
          <p className="text-slate-500 font-medium">Loading MirAIe...</p>
        </div>
      </div>
    );
  }

  // ========== LOGIN ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-miraie-400 to-miraie-600 flex items-center justify-center shadow-lg shadow-miraie-500/25">
              <Wind className="text-white" size={36} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MirAIe Dashboard</h1>
            <p className="text-slate-500 mt-2">Sign in with your MirAIe account</p>
          </div>

          <form onSubmit={handleLogin} className="glass-card p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email or Mobile</label>
              <input
                name="userId"
                type="text"
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                name="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Power size={18} />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Credentials are sent directly to Panasonic. We never store them.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ========== MAIN DASHBOARD ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-0 border-b border-slate-200/60 rounded-none">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-miraie-400 to-miraie-600 flex items-center justify-center">
                <Wind className="text-white" size={16} />
              </div>
              <h1 className="text-base font-semibold text-slate-900">MirAIe</h1>
            </div>
            <div className="flex items-center gap-2">
              {acState.online ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-700">Offline</span>
                </div>
              )}
              <button onClick={pollStatus} className="btn-icon" title="Refresh">
                <RefreshCw size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Device Selector */}
        {devices.length > 1 && (
          <div className="mb-4">
            <select
              className="input-field max-w-xs text-sm"
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
            { id: 'control' as Tab, label: 'Control', icon: <Thermometer size={15} /> },
            { id: 'schedule' as Tab, label: 'Schedule', icon: <Clock size={15} /> },
            { id: 'stats' as Tab, label: 'Stats', icon: <BarChart3 size={15} /> },
            { id: 'settings' as Tab, label: 'Settings', icon: <Settings size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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

        {/* ========== CONTROL TAB ========== */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column - Main Control */}
            <div className="lg:col-span-2 space-y-5">
              {/* Temperature Card - MirAIe style */}
              <div className="glass-card p-8 relative overflow-hidden">
                {/* Mode gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${acState.power ? getModeColor(acState.mode) : 'from-slate-100 to-slate-50'} opacity-[0.03]`} />
                
                <div className="relative">
                  {/* Mode & Status Row */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        acState.power ? 'bg-miraie-100 text-miraie-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {getModeIcon(acState.mode === 'off' ? 'cool' : acState.mode)}
                      </div>
                      <span className="text-sm font-medium text-slate-600 capitalize">
                        {acState.power ? acState.mode : 'Off'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Thermometer size={14} />
                      <span>Room {acState.roomTemperature}°C</span>
                    </div>
                  </div>

                  {/* Large Temperature Display */}
                  <div className="text-center mb-8">
                    <div className="relative inline-flex items-start">
                      <span className="text-8xl font-extralight text-slate-900 tracking-tighter leading-none">
                        {acState.temperature}
                      </span>
                      <span className="text-2xl font-light text-slate-400 mt-2">°C</span>
                    </div>
                  </div>

                  {/* Temperature +/- Controls */}
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <button
                      onClick={() => sendCommand({ temperature: Math.max(16, acState.temperature - 1) })}
                      disabled={!acState.power || isSending || acState.temperature <= 16}
                      className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center 
                               text-slate-600 hover:border-miraie-300 hover:bg-miraie-50 transition-all
                               disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    >
                      <Minus size={22} />
                    </button>

                    <button
                      onClick={togglePower}
                      disabled={isSending}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                        acState.power
                          ? 'bg-gradient-to-br from-miraie-500 to-miraie-600 text-white shadow-miraie-500/30 hover:shadow-miraie-500/50'
                          : 'bg-slate-200 text-slate-500 shadow-slate-200/50 hover:bg-slate-300'
                      } active:scale-95 disabled:opacity-50`}
                    >
                      <Power size={28} />
                    </button>

                    <button
                      onClick={() => sendCommand({ temperature: Math.min(30, acState.temperature + 1) })}
                      disabled={!acState.power || isSending || acState.temperature >= 30}
                      className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center 
                               text-slate-600 hover:border-miraie-300 hover:bg-miraie-50 transition-all
                               disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    >
                      <Plus size={22} />
                    </button>
                  </div>

                  {/* Mode Tabs - MirAIe style */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      { value: 'cool', label: 'Cool', icon: <Snowflake size={14} /> },
                      { value: 'heat', label: 'Heat', icon: <Flame size={14} /> },
                      { value: 'dry', label: 'Dry', icon: <Droplets size={14} /> },
                      { value: 'auto', label: 'Auto', icon: <Gauge size={14} /> },
                      { value: 'fan', label: 'Fan', icon: <Fan size={14} /> },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => sendCommand({ mode: mode.value as ACMode, power: true })}
                        disabled={isSending}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap ${
                          acState.power && acState.mode === mode.value
                            ? 'bg-miraie-500 text-white border-miraie-500 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        } disabled:opacity-40 active:scale-95`}
                      >
                        {mode.icon}
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fan Speed - MirAIe style slider */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Fan size={16} className="text-slate-500" />
                    Fan Speed
                  </h3>
                  <span className="text-sm font-semibold text-miraie-600">
                    {acState.fanSpeed === 'auto' ? 'Auto' : `Level ${acState.fanSpeed}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(['auto', '1', '2', '3', '4', '5'] as FanSpeed[]).map((speed, i) => (
                    <button
                      key={speed}
                      onClick={() => sendCommand({ fanSpeed: speed })}
                      disabled={!acState.power || isSending}
                      className={`flex-1 py-3 rounded-xl text-xs font-medium transition-all duration-200 ${
                        acState.fanSpeed === speed
                          ? 'bg-miraie-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } disabled:opacity-40 active:scale-95`}
                    >
                      {speed === 'auto' ? 'Auto' : i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Converti7 - MirAIe style */}
              <div className="glass-card p-6">
                <button
                  onClick={() => setShowConverti(!showConverti)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Zap size={16} className="text-slate-500" />
                    Converti7 Power Level
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-miraie-600">
                      {acState.convertiMode === 'off' ? 'Off' : 
                       acState.convertiMode === 'fc' ? 'FC' :
                       acState.convertiMode === 'hc' ? 'HC' :
                       `${acState.convertiMode}%`}
                    </span>
                    {showConverti ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>
                
                {showConverti && (
                  <div className="mt-4 grid grid-cols-5 gap-2 animate-fade-in">
                    {convertiOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => sendCommand({ convertiMode: opt.value })}
                        disabled={!acState.power || isSending}
                        className={`py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                          acState.convertiMode === opt.value
                            ? 'bg-miraie-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } disabled:opacity-40 active:scale-95`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nanoe & LED Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-teal-500" />
                      <span className="text-sm font-medium text-slate-700">Nanoe™</span>
                    </div>
                    <button
                      onClick={() => sendCommand({ nanoeG: !acState.nanoeG })}
                      disabled={!acState.power || isSending}
                      className={`toggle-switch ${acState.nanoeG ? 'active' : ''}`}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {acState.nanoeG ? 'Air purification active' : 'Tap to enable'}
                  </p>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {acState.acdc ? <Eye size={16} className="text-slate-600" /> : <EyeOff size={16} className="text-slate-400" />}
                      <span className="text-sm font-medium text-slate-700">LED Display</span>
                    </div>
                    <button
                      onClick={() => sendCommand({ acdc: !acState.acdc })}
                      disabled={isSending}
                      className={`toggle-switch ${acState.acdc ? 'active' : ''}`}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {acState.acdc ? 'Display is on' : 'Display is off'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Sensors & Info */}
            <div className="space-y-5">
              {/* Air Quality - MirAIe style */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Air Quality Sensor</h3>
                <div className="text-center mb-4">
                  <div className="text-4xl font-light text-slate-900 mb-1">
                    {acState.airQuality}
                  </div>
                  <div className="text-sm text-slate-500">µg/m³</div>
                </div>
                {(() => {
                  const aq = getAirQualityLabel(acState.airQuality);
                  return (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl ${aq.bg} border ${aq.border}`}>
                      <Activity size={14} className={aq.color} />
                      <span className={`text-sm font-medium ${aq.color}`}>{aq.label}</span>
                    </div>
                  );
                })()}
                <button className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                  Take Action
                </button>
              </div>

              {/* Room Conditions */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Room Conditions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                        <Thermometer size={18} className="text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Temperature</p>
                        <p className="text-xl font-semibold text-slate-900">{acState.roomTemperature}°C</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Droplets size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Humidity</p>
                        <p className="text-xl font-semibold text-slate-900">{acState.humidity}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Presets - MirAIe style cards */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Quick Presets</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'sleep', label: 'Sleep', icon: <Moon size={20} />, desc: '26°C Low', color: 'from-indigo-500 to-purple-500' },
                    { id: 'comfort', label: 'Comfort', icon: <Sun size={20} />, desc: '24°C Auto', color: 'from-amber-500 to-orange-500' },
                    { id: 'purify', label: 'Purify', icon: <Shield size={20} />, desc: 'Nanoe On', color: 'from-teal-500 to-cyan-500' },
                    { id: 'eco', label: 'Eco', icon: <Leaf size={20} />, desc: 'Energy Save', color: 'from-emerald-500 to-green-500' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        const commands: Record<string, Partial<ACState>> = {
                          sleep: { power: true, mode: 'cool', temperature: 26, fanSpeed: '1', preset: 'sleep' },
                          comfort: { power: true, mode: 'auto', temperature: 24, fanSpeed: 'auto', preset: 'comfort' },
                          purify: { power: true, nanoeG: true, mode: 'fan', fanSpeed: '1' },
                          eco: { power: true, mode: 'cool', temperature: 26, fanSpeed: 'auto', preset: 'economy' },
                        };
                        sendCommand(commands[preset.id] || {});
                      }}
                      disabled={isSending}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 
                               hover:shadow-md transition-all duration-200 text-left active:scale-95"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-white mb-3`}>
                        {preset.icon}
                      </div>
                      <div className="font-medium text-slate-900 text-sm">{preset.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Swing Controls */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Swing</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-slate-700">Vertical</span>
                    <button
                      onClick={() => sendCommand({ verticalSwing: !acState.verticalSwing })}
                      disabled={!acState.power || isSending}
                      className={`toggle-switch ${acState.verticalSwing ? 'active' : ''}`}
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-slate-700">Horizontal</span>
                    <button
                      onClick={() => sendCommand({ horizontalSwing: !acState.horizontalSwing })}
                      disabled={!acState.power || isSending}
                      className={`toggle-switch ${acState.horizontalSwing ? 'active' : ''}`}
                    />
                  </label>
                </div>
              </div>

              {/* Device Info */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Device Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model</span>
                    <span className="text-slate-900 font-medium">{acState.modelName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Firmware</span>
                    <span className="text-slate-900 font-medium">{acState.firmwareVersion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="text-slate-900 font-medium">
                      {new Date(acState.lastUpdated).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== SCHEDULE TAB ========== */}
        {activeTab === 'schedule' && (
          <div className="glass-card p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Schedules</h2>
              <button className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Schedule
              </button>
            </div>
            <div className="text-center py-12">
              <Clock className="mx-auto mb-4 text-slate-300" size={48} />
              <p className="text-slate-500 font-medium">No schedules yet</p>
              <p className="text-sm text-slate-400 mt-1">Create schedules to automate your AC</p>
            </div>
          </div>
        )}

        {/* ========== STATS TAB ========== */}
        {activeTab === 'stats' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Runtime Today', value: '4.5h', icon: <Clock size={16} />, change: '↓ 12%' },
                { label: 'Energy Used', value: '3.2 kWh', icon: <Zap size={16} />, change: '≈ ₹25.60' },
                { label: 'Avg Temp', value: '23.5°C', icon: <Thermometer size={16} />, change: 'Set: 24°C' },
                { label: 'Most Used', value: 'Cool', icon: <Snowflake size={16} />, change: '68% runtime' },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-5">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    {stat.icon}
                    {stat.label}
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.change}</div>
                </div>
              ))}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Energy Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <Leaf className="text-blue-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Eco Tip</p>
                    <p className="text-sm text-blue-700">Setting your AC to 24°C instead of 22°C can save up to 15% on energy.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                  <Zap className="text-amber-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Peak Usage</p>
                    <p className="text-sm text-amber-700">Your highest usage is between 2PM - 6PM. Consider pre-cooling during off-peak hours.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== SETTINGS TAB ========== */}
        {activeTab === 'settings' && (
          <div className="glass-card p-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Connection</h3>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {acState.online ? <Wifi className="text-emerald-500" size={20} /> : <WifiOff className="text-red-500" size={20} />}
                      <div>
                        <p className="font-medium text-slate-900">{acState.online ? 'Connected' : 'Disconnected'}</p>
                        <p className="text-xs text-slate-500">Last updated: {new Date(acState.lastUpdated).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <button onClick={pollStatus} className="btn-secondary text-sm">Refresh</button>
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
                        <p className="text-xs text-slate-500">Control your AC with voice (browser support required)</p>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm flex items-center gap-1.5">
                      <Volume2 size={14} /> Enable
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Account</h3>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <button
                    onClick={() => { setIsAuthenticated(false); setDevices([]); }}
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
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
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
                activeTab === tab.id ? 'text-miraie-600' : 'text-slate-400'
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
