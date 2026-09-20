import React, { useEffect, useState, useCallback } from 'react';
import {
  Cloud, Wind, Droplets, Thermometer, AlertTriangle,
  RefreshCw, Wifi, WifiOff
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface WeatherCurrent {
  temp_c: number | null;
  humidity_pct: number | null;
  wind_kmh: number | null;
  precip_mm: number | null;
  weather_code: number;
  risk: 'high' | 'moderate' | 'low' | 'none';
}

interface WeatherData {
  lat: number;
  lng: number;
  current: WeatherCurrent;
  hourly: {
    times?: string[];
    temp_c?: number[];
    precip_prob_pct?: number[];
    wind_kmh?: number[];
  };
  fetched_at: string;
  degraded?: boolean;
}

const RISK_STYLES = {
  high: 'bg-red-50 border-red-300 text-red-800',
  moderate: 'bg-orange-50 border-orange-300 text-orange-800',
  low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  none: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

const WC_LABEL: Record<number, string> = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Rain Showers', 81: 'Heavy Showers', 82: 'Violent Showers',
  95: 'Thunderstorm', 96: 'Hail Thunderstorm', 99: 'Heavy Hail Thunderstorm',
};

function getWcLabel(code: number): string {
  for (let c = code; c >= 0; c--) {
    if (WC_LABEL[c]) return WC_LABEL[c];
  }
  return 'Unknown';
}

export const WeatherWidget: React.FC<{ lat?: number; lng?: number; compact?: boolean }> = ({
  lat = 22.30, lng = 73.19, compact = false,
}) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await window.fetch(
        `${API}/api/weather?lat=${lat}&lng=${lng}`,
        { headers: { 'x-role': 'dispatcher' } }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => { fetch(); }, [fetch]);
  // Auto-refresh every 10 min
  useEffect(() => {
    const t = setInterval(fetch, 600_000);
    return () => clearInterval(t);
  }, [fetch]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
        <Cloud className="w-4 h-4" /> Loading weather…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500">
        <WifiOff className="w-4 h-4" /> Weather unavailable
      </div>
    );
  }

  const { current } = data;
  const riskClass = RISK_STYLES[current.risk];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${riskClass}`}>
        <Cloud className="w-3.5 h-3.5" />
        <span>{current.temp_c != null ? `${Math.round(current.temp_c)}°C` : '--'}</span>
        <span className="text-[10px] opacity-75">{getWcLabel(current.weather_code)}</span>
        {current.risk !== 'none' && (
          <span className="flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" />
            {current.risk} risk
          </span>
        )}
        {data.degraded && <WifiOff className="w-3 h-3 opacity-50" />}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${riskClass}`}>
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          <div>
            <div className="font-semibold text-sm">Weather — Vadodara</div>
            <div className="text-xs opacity-75">{getWcLabel(current.weather_code)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {current.risk !== 'none' && (
            <span className="flex items-center gap-1 text-xs font-bold uppercase">
              <AlertTriangle className="w-4 h-4" /> {current.risk} risk
            </span>
          )}
          <button onClick={fetch} className="p-1 rounded hover:bg-white/40 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50">
        {[
          { icon: <Thermometer className="w-4 h-4 text-orange-500" />, label: 'Temp', value: current.temp_c != null ? `${Math.round(current.temp_c)}°C` : '--' },
          { icon: <Droplets className="w-4 h-4 text-blue-500" />, label: 'Humidity', value: current.humidity_pct != null ? `${current.humidity_pct}%` : '--' },
          { icon: <Wind className="w-4 h-4 text-slate-500" />, label: 'Wind', value: current.wind_kmh != null ? `${Math.round(current.wind_kmh)} km/h` : '--' },
          { icon: <Droplets className="w-4 h-4 text-sky-500" />, label: 'Rain', value: current.precip_mm != null ? `${current.precip_mm} mm` : '--' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 py-3 px-2">
            {s.icon}
            <span className="text-xs font-semibold text-slate-700">{s.value}</span>
            <span className="text-[10px] text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Hourly sparkline-style */}
      {data.hourly?.times && data.hourly.times.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-xs text-slate-500 mb-2 font-medium">Next 12h</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {data.hourly.times.slice(0, 12).map((t, i) => {
              const pp = data.hourly.precip_prob_pct?.[i] ?? 0;
              const w = data.hourly.wind_kmh?.[i] ?? 0;
              const tmp = data.hourly.temp_c?.[i];
              const hour = new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true });
              return (
                <div key={t} className="flex flex-col items-center gap-0.5 min-w-[42px] text-center">
                  <span className="text-[10px] text-slate-400">{hour}</span>
                  <span className="text-xs font-semibold text-slate-700">{tmp != null ? `${Math.round(tmp)}°` : '--'}</span>
                  <div
                    className="w-full h-1 rounded-full"
                    style={{
                      background: pp > 60 ? '#3b82f6' : pp > 30 ? '#93c5fd' : '#e2e8f0',
                    }}
                    title={`${pp}% rain`}
                  />
                  <span className="text-[9px] text-slate-400">{pp}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pb-2 text-[10px] text-slate-400">
        {data.degraded ? '⚠ Degraded (cached)' : `Updated ${new Date(data.fetched_at).toLocaleTimeString('en-IN')}`}
        {' · Source: Open-Meteo'}
      </div>
    </div>
  );
};
