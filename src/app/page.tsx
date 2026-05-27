'use client';

import { useState, useEffect, useCallback } from 'react';
import { Power, Wind, RefreshCw, Snowflake, Flame, Fan, Gauge, Zap, ChevronRight, LogOut, ChevronDown, ChevronUp, Eye, EyeOff, MoveVertical, MoveHorizontal } from 'lucide-react';

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acState, setAcState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showConverti, setShowConverti] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('home_auth_token');
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
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: fd.get('userId'), password: fd.get('password') }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('home_auth_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        fetchDevices(data.token);
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  const fetchDevices = async (authToken: string) => {
    try {
      const res = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${authToken}` } });
      const data = await res.json();
      if (res.ok) setDevices(data.devices || []);
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
    setIsSending(true);
    try {
      await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deviceId: selectedId, command }),
      });
      // Verification Poll
      setTimeout(pollStatus, 800);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><RefreshCw className="animate-spin text-blue-500" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-black text-white text-center mb-8 uppercase tracking-widest">Master Remote</h1>
          <input name="userId" placeholder="Panasonic ID" className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white outline-none" required />
          <input name="password" type="password" placeholder="Password" className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white outline-none" required />
          <button className="w-full p-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all">CONNECT SYSTEM</button>
        </form>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-md mx-auto">
          <header className="flex justify-between items-center mb-10"><h1 className="text-xl font-black text-white uppercase italic">Active Nodes</h1><button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-600"><LogOut size={20} /></button></header>
          <div className="space-y-4">
            {devices.map((d) => (
              <button key={d.deviceId} onClick={() => setSelectedId(d.deviceId)} className="w-full p-6 bg-zinc-900 rounded-[32px] flex items-center justify-between border border-zinc-800 hover:border-blue-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${d.online ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'} rounded-2xl flex items-center justify-center`}><Snowflake /></div>
                  <div className="text-left"><p className="text-white font-bold">{d.deviceName}</p><p className="text-zinc-500 text-[10px] font-bold">{d.online ? 'ONLINE' : 'OFFLINE'}</p></div>
                </div>
                <ChevronRight className="text-zinc-700" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!acState) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <button onClick={() => setSelectedId(null)} className="text-zinc-500 text-[10px] font-bold tracking-widest border border-zinc-800 px-4 py-2 rounded-full">← ESCAPE</button>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${acState.online ? 'text-emerald-500' : 'text-red-500'}`}>{acState.online ? 'SYSTEM LIVE' : 'NODE OFFLINE'}</p>
        </header>

        {/* Console Panel */}
        <div className="bg-zinc-900 rounded-[48px] p-8 border border-zinc-800 text-center relative overflow-hidden">
          {isSending && <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10"><RefreshCw className="animate-spin text-blue-500" /></div>}
          <div className="flex justify-between mb-8">
            <div className="text-left"><p className="text-zinc-500 text-[9px] font-bold">INSIDE</p><p className="text-xl font-bold">{acState.roomTemperature}°</p></div>
            <div className="text-right">
              <p className="text-zinc-500 text-[9px] font-bold">DISPLAY</p>
              <button onClick={() => sendCommand({ display: !acState.display })} className={`text-xl font-bold ${acState.display ? 'text-blue-500' : 'text-zinc-700'}`}>
                {acState.display ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          <div className="relative inline-block mb-10"><span className="text-[120px] font-thin leading-none">{acState.temperature}</span><span className="text-2xl font-bold text-zinc-700 absolute -top-2 -right-6">°C</span></div>
          <div className="flex justify-center gap-10">
            <button onClick={() => sendCommand({ temperature: acState.temperature - 1 })} className="w-16 h-16 rounded-full border border-zinc-700 text-3xl font-light active:bg-zinc-800">−</button>
            <button onClick={() => sendCommand({ power: !acState.power })} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${acState.power ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-zinc-800 text-zinc-600'}`}><Power size={32} /></button>
            <button onClick={() => sendCommand({ temperature: acState.temperature + 1 })} className="w-16 h-16 rounded-full border border-zinc-700 text-3xl font-light active:bg-zinc-800">+</button>
          </div>
        </div>

        {/* Master Toggles */}
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => sendCommand({ preset: acState.preset === 'powerful' ? 'none' : 'powerful' })} className={`p-6 rounded-[32px] flex flex-col items-center gap-2 transition-all ${acState.preset === 'powerful' ? 'bg-orange-600' : 'bg-zinc-900 border border-zinc-800'}`}><Zap size={24} /><p className="text-xs font-bold uppercase">Powerful</p></button>
           <button onClick={() => sendCommand({ preset: acState.preset === 'ai' ? 'none' : 'ai' })} className={`p-6 rounded-[32px] flex flex-col items-center gap-2 transition-all ${acState.preset === 'ai' ? 'bg-indigo-600' : 'bg-zinc-900 border border-zinc-800'}`}><Gauge size={24} /><p className="text-xs font-bold uppercase">True AI</p></button>
        </div>

        {/* 7-in-1 Converti Panel */}
        <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800">
          <button onClick={() => setShowConverti(!showConverti)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Converti 7-in-1</p></div>
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-500 uppercase">{acState.convertiMode}</span>{showConverti ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
          </button>
          {showConverti && (
            <div className="mt-6 grid grid-cols-4 gap-2 animate-fade-in">
              {['off', '45', '55', '70', '80', '90', '100', 'hc'].map((v) => (
                <button key={v} onClick={() => sendCommand({ convertiMode: v })} className={`py-3 rounded-2xl text-[9px] font-bold uppercase ${acState.convertiMode === v ? 'bg-blue-600' : 'bg-black text-zinc-600'}`}>{v}</button>
              ))}
            </div>
          )}
        </div>

        {/* Hardware Controls Grid */}
        <div className="grid grid-cols-3 gap-3">
            <button onClick={() => sendCommand({ fanSpeed: acState.fanSpeed === 'auto' ? '1' : (parseInt(acState.fanSpeed)+1 > 5 ? 'auto' : (parseInt(acState.fanSpeed)+1).toString()) })} className="bg-zinc-900 p-4 border border-zinc-800 rounded-3xl flex flex-col items-center gap-2">
                <Fan size={20} className="text-blue-500" />
                <p className="text-[9px] font-bold">FAN: {acState.fanSpeed.toUpperCase()}</p>
            </button>
            <button onClick={() => sendCommand({ verticalSwing: !acState.verticalSwing })} className={`bg-zinc-900 p-4 border border-zinc-800 rounded-3xl flex flex-col items-center gap-2 ${acState.verticalSwing ? 'bg-blue-600/10 border-blue-500' : ''}`}>
                <MoveVertical size={20} className={acState.verticalSwing ? 'text-blue-400' : 'text-zinc-600'} />
                <p className="text-[9px] font-bold uppercase">V_SWING</p>
            </button>
            <button onClick={() => sendCommand({ horizontalSwing: !acState.horizontalSwing })} className={`bg-zinc-900 p-4 border border-zinc-800 rounded-3xl flex flex-col items-center gap-2 ${acState.horizontalSwing ? 'bg-blue-600/10 border-blue-500' : ''}`}>
                <MoveHorizontal size={20} className={acState.horizontalSwing ? 'text-blue-400' : 'text-zinc-600'} />
                <p className="text-[9px] font-bold uppercase">H_SWING</p>
            </button>
        </div>

        {/* Mode Selector */}
        <div className="bg-zinc-900 p-2 rounded-[24px] border border-zinc-800 flex gap-1">
           {['cool', 'dry', 'fan', 'auto'].map((m) => (
             <button key={m} onClick={() => sendCommand({ mode: m })} className={`flex-1 py-4 rounded-[18px] text-[9px] font-bold uppercase ${acState.mode === m ? 'bg-blue-600' : 'text-zinc-600'}`}>{m}</button>
           ))}
        </div>
      </div>
    </div>
  );
}
