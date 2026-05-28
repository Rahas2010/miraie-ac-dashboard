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
    // HAOS METHODOLOGY: Optimistic Update (Immediate UI response)
    setAcState((prev: any) => ({ ...prev, ...command }));
    setIsSending(true);
    try {
      await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deviceId: selectedId, command }),
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><RefreshCw className="animate-spin text-blue-500" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-mono">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
          <h1 className="text-xl font-bold border-l-4 border-blue-600 pl-4 uppercase">System Authorization</h1>
          <input name="userId" placeholder="Panasonic ID" className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg outline-none" required />
          <input name="password" type="password" placeholder="Password" className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg outline-none" required />
          <button className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all">ESTABLISH HANDSHAKE</button>
        </form>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="min-h-screen bg-black p-6 font-mono">
        <div className="max-w-md mx-auto">
          <header className="flex justify-between items-center mb-10 text-white">
            <h1 className="text-lg font-bold uppercase tracking-widest">Available Nodes</h1>
            <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-600"><LogOut size={20} /></button>
          </header>
          <div className="space-y-4">
            {devices.map((d) => (
              <button key={d.deviceId} onClick={() => setSelectedId(d.deviceId)} className="w-full p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between text-white hover:border-blue-600 transition-all">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center"><Snowflake size={20} /></div>
                  <div><p className="font-bold text-sm uppercase">{d.deviceName}</p><p className="text-zinc-500 text-[10px]">{d.spaceName}</p></div>
                </div>
                <ChevronRight className="text-zinc-700" size={16} />
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
        <header className="flex justify-between items-center border-b border-zinc-900 pb-6">
          <button onClick={() => setSelectedId(null)} className="text-zinc-500 text-xs font-bold">← BACK</button>
          <p className="text-emerald-500 text-[10px] font-bold">● NODE_AVAILABLE</p>
        </header>

        <div className="bg-zinc-900 rounded-[32px] p-8 text-center border border-zinc-800 relative">
          <div className="flex justify-between text-[10px] text-zinc-500 font-bold mb-8">
            <div className="text-left"><p>ROOM_TEMP</p><p className="text-white text-lg">{acState.roomTemperature}°</p></div>
            <div className="text-right"><p>DISPLAY</p><button onClick={() => sendCommand({ display: !acState.display })} className={`text-lg ${acState.display ? 'text-blue-500' : 'text-zinc-700'}`}>{acState.display ? 'ON' : 'OFF'}</button></div>
          </div>
          <div className="relative inline-block mb-10"><span className="text-[120px] font-thin leading-none">{acState.temperature}</span><span className="text-2xl font-bold text-zinc-800 absolute top-0 -right-8">°C</span></div>
          <div className="flex justify-center gap-10">
            <button onClick={() => sendCommand({ temperature: acState.temperature - 1 })} className="w-16 h-16 border border-zinc-700 rounded-full text-3xl font-light active:bg-zinc-800">−</button>
            <button onClick={() => sendCommand({ power: !acState.power })} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${acState.power ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}><Power size={32} /></button>
            <button onClick={() => sendCommand({ temperature: acState.temperature + 1 })} className="w-16 h-16 rounded-full border border-zinc-700 text-3xl font-light active:bg-zinc-800">+</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => sendCommand({ preset: acState.preset === 'powerful' ? 'none' : 'powerful' })} className={`p-6 rounded-2xl border border-zinc-800 text-[10px] font-bold uppercase transition-all ${acState.preset === 'powerful' ? 'bg-orange-600 border-orange-600' : 'bg-zinc-900'}`}>Powerful_Mode</button>
           <button onClick={() => sendCommand({ preset: acState.preset === 'ai' ? 'none' : 'ai' })} className={`p-6 rounded-2xl border border-zinc-800 text-[10px] font-bold uppercase transition-all ${acState.preset === 'ai' ? 'bg-indigo-600 border-indigo-600' : 'bg-zinc-900'}`}>True_AI_System</button>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
           <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Converti 7-in-1 Control</p>
           <div className="grid grid-cols-4 gap-2">
              {['off', '45', '55', '70', '80', '90', '100', 'hc'].map(v => (
                <button key={v} onClick={() => sendCommand({ convertiMode: v })} className={`py-3 rounded-lg text-[9px] font-bold uppercase border border-zinc-800 ${acState.convertiMode === v ? 'bg-blue-600 border-blue-600' : 'bg-black text-zinc-500'}`}>{v}</button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
            <button onClick={() => sendCommand({ fanSpeed: acState.fanSpeed === 'auto' ? '1' : (parseInt(acState.fanSpeed)+1 > 5 ? 'auto' : (parseInt(acState.fanSpeed)+1).toString()) })} className="bg-zinc-900 p-4 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2">
                <Fan size={20} className="text-blue-500" />
                <p className="text-[8px] font-bold">FAN: {acState.fanSpeed.toUpperCase()}</p>
            </button>
            <button onClick={() => sendCommand({ verticalSwing: !acState.verticalSwing })} className={`bg-zinc-900 p-4 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 ${acState.verticalSwing ? 'border-blue-500' : ''}`}>
                <MoveVertical size={20} className={acState.verticalSwing ? 'text-blue-400' : 'text-zinc-700'} />
                <p className="text-[8px] font-bold">V_SWING</p>
            </button>
            <button onClick={() => sendCommand({ horizontalSwing: !acState.horizontalSwing })} className={`bg-zinc-900 p-4 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 ${acState.horizontalSwing ? 'border-blue-500' : ''}`}>
                <MoveHorizontal size={20} className={acState.horizontalSwing ? 'text-blue-400' : 'text-zinc-700'} />
                <p className="text-[8px] font-bold">H_SWING</p>
            </button>
        </div>
      </div>
    </div>
  );
}
