import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Compass, Clock, CheckCircle2, Shield, MapPin, RefreshCw, Radio } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { TrackData } from '../../types/domain';

export const TrackPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const activeId = trackId || 'TRK-9821';

  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrack = async () => {
    setLoading(true);
    try {
      const data = await api.getTrack(activeId);
      setTrackData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrack();
    const interval = setInterval(fetchTrack, 5000);
    return () => clearInterval(interval);
  }, [activeId]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Public Incident Response Tracking</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">
            Live Emergency Status
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Tracking Code: <span className="font-mono text-blue-600 font-bold">{activeId}</span>
          </p>
        </div>

        {trackData ? (
          <Card elevation="raised" className="p-6 space-y-6 shadow-tile">
            {/* Status & ETA Tile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Current Status
                </span>
                <div className="text-base font-heading font-bold text-slate-900 mt-0.5">
                  {trackData.status}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{trackData.area}</span>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Estimated Arrival
                </span>
                <div className="text-2xl font-mono font-bold text-emerald-600">
                  ~{trackData.eta_min} min
                </div>
                <span className="text-[11px] text-slate-400">
                  Crews actively en route
                </span>
              </div>
            </div>

            {/* Verified Operational Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                  Verified Response Progress
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Feed
                </span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {trackData.updates.map((upd, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white shadow-sm" />
                    <div className="text-xs font-mono font-semibold text-blue-600">
                      {upd.ts}
                    </div>
                    <p className="text-xs text-slate-600 font-sans leading-relaxed mt-0.5">
                      {upd.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reassurance Footer */}
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center gap-3 text-xs text-blue-900">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Vadodara Central Command is continuously coordinating fleet telemetry and hospital availability.
              </span>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchTrack}
            >
              Refresh Status
            </Button>
          </Card>
        ) : (
          <Card className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading incident status...</p>
          </Card>
        )}
      </div>
    </div>
  );
};
