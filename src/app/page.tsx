'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Power, Wind, Droplets, RefreshCw, 
  Snowflake, Flame, Fan, Gauge, Shield, Eye, EyeOff,
  ChevronRight, LogOut, Activity
} from 'lucide-react';

// ========== TYPES ==========
type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan' | 'off';
type FanSpeed = 'auto' | '1' | '2' | '3' | '4' | '5';

interface ACState {
  power: boolean;
  mode: ACMode;
  temperature: number;
  fanSpeed: FanSpeed;
  verticalSwing: boolean;
  horizontalSwing: boolean;
  nanoeG: boolean;
  acdc: boolean;
  roomTemperature: number;
  humidity: number;
  online: boolean;
  lastUpdated: string;
}

interface Device {
  deviceId: string;
  deviceName: string;
  spaceName: string;
  homeName: string;
  online: boolean;
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [acState, setAcState] = useState<ACState | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // --- Initial Auth Check ---
  useEffect(() => {
    const savedToken = sessionStorage.getItem('miraie_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchDevicesInternal(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // --- Device Management ---
  const fetchDevicesInternal = async (authToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/devices', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      } else {
        handleLogout();
      }
    } catch (err) {
      setError('Network error fetching devices');
    } finally {
      setIsLoading(false);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!selectedDeviceId || !token) return;
    // Note: status still returns mock/cached data unless MQTT bridge is used
    try {
      const res = await fetch(`/api/status?deviceId=${selectedDeviceId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.state) setAcState((prev) => ({ ...prev, ...data.state }));
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  }, [selectedDeviceId, token]);

  useEffect(() => {
    if (selectedDeviceId) {
      pollStatus();
      const interval = setInterval(pollStatus, 20000);
      return () => clearInterval(interval);
    }
  }, [selectedDeviceId, pollStatus]);

  // --- Handlers ---
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const userId = formData.get('userId');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        sessionStorage.setItem('miraie_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        fetchDevicesInternal(data.token);
      } else {
        setError(data.error || 'Login failed');
        setIsLoading(false);
      }
    } catch {
      setError('Connection failed');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('miraie_token');
    setToken(null);
    setIsAuthenticated(false);
    setDevices([]);
    setSelectedDeviceId(null);
    setAcState(null);
  };

  const sendCommand = async (command: Partial<ACState>) => {
    if (!selectedDeviceId || !token) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId: selectedDeviceId, command }),
      });
      if (res.ok) {
        setAcState((prev) => prev ? { ...prev, ...command } : null);
      } else {
        setError('Failed to send command');
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsSending(false);
    }
  };

  // --- Views ---
  if (isLoading && !devices.length) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-miraie-600" size={32} /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-miraie-600 rounded-3xl flex items-center justify-center shadow-lg"><Wind className="text-white" size={40} /></div>
            <h1 className="text-2xl font-bold text-slate-900">MirAIe Login</h1>
          </div>
          <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-sm space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
            <input name="userId" type="text" placeholder="Email or Mobile" className="input-field" required />
            <input name="password" type="password" placeholder="Password" className="input-field" required />
            <button type="submit" className="btn-primary w-full">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  if (!selectedDeviceId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-slate-900">My Devices</h1>
            <div className="flex gap-2">
              <button onClick={() => fetchDevicesInternal(token!)} className="btn-icon bg-white shadow-sm"><RefreshCw size={20} /></button>
              <button onClick={handleLogout} className="btn-icon bg-white shadow-sm text-red-500"><LogOut size={20} /></button>
            </div>
          </div>
          <div className="grid gap-4">
            {devices.map((device) => (
              <button key={device.deviceId} onClick={() => setSelectedDeviceId(device.deviceId)} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${device.online ? 'bg-miraie-50 text-miraie-600' : 'bg-slate-100 text-slate-400'}`}><Snowflake size={24} /></div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{device.deviceName}</h3>
                    <p className="text-sm text-slate-500">{device.spaceName}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-miraie-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!acState) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-miraie-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => setSelectedDeviceId(null)} className="text-slate-500 font-medium hover:text-slate-900 transition-colors">← Back</button>
          <div className="text-center">
            <h2 className="font-bold text-slate-900 leading-tight">{devices.find(d => d.deviceId === selectedDeviceId)?.deviceName}</h2>
          </div>
          <button onClick={pollStatus} className="btn-icon"><RefreshCw size={18} className={isSending ? 'animate-spin' : ''} /></button>
        </div>
      </header>
      <main className="max-w-xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-[40px] p-10 shadow-sm relative overflow-hidden text-center">
          <div className="flex justify-between items-center mb-10">
             <div className="flex items-center gap-2 text-slate-500 text-sm"><Activity size={16} /> {acState.roomTemperature}°C Room</div>
             <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${acState.online ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{acState.online ? 'Online' : 'Offline'}</div>
          </div>
          <div className="relative inline-block mb-10">
            <span className="text-[120px] font-light leading-none tracking-tighter text-slate-900">{acState.temperature}</span>
            <span className="text-2xl font-medium text-slate-300 absolute -top-2 -right-6">°C</span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <button onClick={() => sendCommand({ temperature: acState.temperature - 1 })} disabled={!acState.power || isSending} className="w-16 h-16 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all disabled:opacity-20"><span className="text-3xl font-light">−</span></button>
            <button onClick={() => sendCommand({ power: !acState.power })} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${acState.power ? 'bg-miraie-600 text-white shadow-miraie-500/40' : 'bg-slate-100 text-slate-400'}`}><Power size={32} /></button>
            <button onClick={() => sendCommand({ temperature: acState.temperature + 1 })} disabled={!acState.power || isSending} className="w-16 h-16 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all disabled:opacity-20"><span className="text-3xl font-light">+</span></button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
           {(['cool', 'dry', 'fan', 'heat', 'auto'] as ACMode[]).map((m) => (
             <button key={m} onClick={() => sendCommand({ mode: m, power: true })} disabled={isSending} className={`flex flex-col items-center justify-center py-4 rounded-3xl transition-all ${acState.mode === m && acState.power ? 'bg-miraie-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
               <span className="text-[10px] mt-2 font-bold uppercase">{m}</span>
             </button>
           ))}
        </div>
        <div className="bg-white p-6 rounded-[32px] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Fan size={16} className="text-slate-400" /> FAN SPEED</h3>
            <span className="text-miraie-600 font-bold text-sm uppercase">{acState.fanSpeed}</span>
          </div>
          <div className="flex gap-2">
            {(['auto', '1', '2', '3', '4', '5'] as FanSpeed[]).map((f) => (
              <button key={f} onClick={() => sendCommand({ fanSpeed: f })} className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${acState.fanSpeed === f ? 'bg-miraie-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>{f === 'auto' ? 'A' : f}</button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
