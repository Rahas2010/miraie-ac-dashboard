'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Power, Wind, Droplets, RefreshCw, Snowflake, Flame, Fan, Gauge, Shield, 
  Activity, Zap, TrendingUp, BarChart3, ChevronRight, LogOut 
} from 'lucide-react';

// Specialized Types for QU-Series
type ACMode = 'cool' | 'heat' | 'dry' | 'auto' | 'fan';
type FanSpeed = 'auto' | '1' | '2' | '3' | '4' | '5';
type Preset = 'none' | 'powerful' | 'eco' | 'ai';

interface ACState {
  power: boolean;
  mode: ACMode;
  temperature: number;
  fanSpeed: FanSpeed;
  preset: Preset;
  roomTemperature: number;
  humidity: number;
  online: boolean;
  energyToday: number;
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acState, setAcState] = useState<ACState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Auth & Init ---
  useEffect(() => {
    const saved = sessionStorage.getItem('home_auth_token');
    if (saved) {
      setToken(saved);
      setIsAuthenticated(true);
      fetchDevices(saved);
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: fd.get('userId'), password: fd.get('password') }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('home_auth_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        fetchDevices(data.token);
      } else {
        setError(data.error);
        setIsLoading(false);
      }
    } catch {
      setError('Connection failed');
      setIsLoading(false);
    }
  };

  const fetchDevices = async (authToken: string) => {
    try {
      const res = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${authToken}` } });
      const data = await res.json();
      setDevices(data.devices || []);
    } finally {
      setIsLoading(false);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!selectedId || !token) return;
    try {
      const res = await fetch(`/api/status?deviceId=${selectedId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.state) setAcState(data.state);
    } catch (err) {}
  }, [selectedId, token]);

  useEffect(() => {
    if (selectedId) {
      pollStatus();
      const i = setInterval(pollStatus, 15000);
      return () => clearInterval(i);
    }
  }, [selectedId, pollStatus]);

  const sendCommand = async (command: any) => {
    if (!selectedId || !token) return;
    try {
      await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deviceId: selectedId, command }),
      });
      setAcState((prev: any) => ({ ...prev, ...command }));
    } catch {}
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><RefreshCw className="animate-spin text-blue-500" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Home Control</h1>
          {error && <div className="p-3 bg-red-900/30 border border-red-500 text-red-400 rounded-xl text-sm">{error}</div>}
          <input name="userId" placeholder="Panasonic ID" className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
          <input name="password" type="password" placeholder="Password" className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
          <button className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all">Sign In</button>
        </form>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-md mx-auto">
          <header className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold text-white">Smart Devices</h1>
            <button onClick={() => { sessionStorage.clear(); location.reload(); }} className="text-slate-400"><LogOut size={20} /></button>
          </header>
          <div className="space-y-4">
            {devices.map((d) => (
              <button key={d.deviceId} onClick={() => setSelectedId(d.deviceId)} className="w-full p-6 bg-slate-900 rounded-[32px] flex items-center justify-between border border-slate-800 hover:border-blue-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center"><Snowflake /></div>
                  <div className="text-left">
                    <p className="text-white font-bold">{d.deviceName}</p>
                    <p className="text-slate-500 text-xs">{d.spaceName}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-700" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!acState) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <button onClick={() => setSelectedId(null)} className="text-slate-400 font-medium">← Devices</button>
          <div className="text-right">
             <p className={`text-[10px] font-bold uppercase tracking-widest ${acState.online ? 'text-emerald-500' : 'text-red-500'}`}>
               {acState.online ? 'Live' : 'Offline'}
             </p>
          </div>
        </header>

        {/* Temperature View */}
        <div className="bg-slate-900 rounded-[48px] p-8 text-center border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between mb-8">
            <div className="text-left">
              <p className="text-slate-500 text-xs font-bold uppercase">Room</p>
              <p className="text-xl font-bold">{acState.roomTemperature}°</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs font-bold uppercase">Today</p>
              <p className="text-xl font-bold text-blue-400">{acState.energyToday} <span className="text-[10px]">kWh</span></p>
            </div>
          </div>

          <div className="relative inline-block mb-10">
            <span className="text-[120px] font-thin tracking-tighter leading-none">{acState.temperature}</span>
            <span className="text-2xl font-medium text-slate-500 absolute -top-2 -right-6">°</span>
          </div>

          <div className="flex justify-center gap-8">
            <button onClick={() => sendCommand({ temperature: acState.temperature - 1 })} className="w-16 h-16 rounded-full bg-slate-800 text-2xl font-light active:bg-slate-700">−</button>
            <button onClick={() => sendCommand({ power: !acState.power })} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${acState.power ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-800 text-slate-500'}`}><Power size={32} /></button>
            <button onClick={() => sendCommand({ temperature: acState.temperature + 1 })} className="w-16 h-16 rounded-full bg-slate-800 text-2xl font-light active:bg-slate-700">+</button>
          </div>
        </div>

        {/* Specialized Modes */}
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => sendCommand({ preset: acState.preset === 'powerful' ? 'none' : 'powerful' })}
             className={`p-6 rounded-[32px] flex items-center gap-4 transition-all ${acState.preset === 'powerful' ? 'bg-orange-600' : 'bg-slate-900 border border-slate-800'}`}
           >
             <Zap size={24} />
             <div className="text-left">
               <p className="text-xs font-bold uppercase opacity-60">Powerful</p>
               <p className="font-bold">Mode</p>
             </div>
           </button>

           <button 
             onClick={() => sendCommand({ preset: acState.preset === 'ai' ? 'none' : 'ai' })}
             className={`p-6 rounded-[32px] flex items-center gap-4 transition-all ${acState.preset === 'ai' ? 'bg-indigo-600' : 'bg-slate-900 border border-slate-800'}`}
           >
             <Gauge size={24} />
             <div className="text-left">
               <p className="text-xs font-bold uppercase opacity-60">True AI</p>
               <p className="font-bold">Auto</p>
             </div>
           </button>
        </div>

        {/* Energy Insights */}
        <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> ENERGY USAGE</h3>
              <button className="text-[10px] font-bold text-slate-500 uppercase">View Chart</button>
           </div>
           <div className="flex items-end gap-1 h-20">
              {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
                <div key={i} className={`flex-1 rounded-t-lg transition-all ${i === 6 ? 'bg-blue-500' : 'bg-slate-800'}`} style={{ height: `${h}%` }}></div>
              ))}
           </div>
           <p className="text-[10px] text-center text-slate-500 mt-4 font-bold tracking-widest uppercase">Last 7 Days (kWh)</p>
        </div>
      </div>
    </div>
  );
}
