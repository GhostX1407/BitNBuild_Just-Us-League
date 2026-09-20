import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { useAlertsStore } from '../../store/alerts';
import { useIncidentsStore } from '../../store/incidents';

export const AlertBanner: React.FC = () => {
  const alerts = useAlertsStore((state) => state.alerts);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);

  const openCriticalAlerts = alerts.filter(
    (a) => a.status === 'open' && (a.kind === 'critical' || a.level >= 2)
  );

  if (openCriticalAlerts.length === 0) return null;

  const topAlert = openCriticalAlerts[0];

  return (
    <div className="px-4 py-1 bg-slate-50 shrink-0 select-none">
      <div className="w-full max-w-6xl mx-auto bg-rose-50/90 border border-rose-200/80 rounded-full px-4 py-1.5 flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="p-1 rounded-full bg-rose-600 text-white shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="font-mono font-bold text-rose-700 uppercase shrink-0">
              [{topAlert.kind.toUpperCase()}]
            </span>
            <span className="text-slate-800 truncate font-medium">
              {topAlert.message}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {topAlert.incident_id && (
            <button
              onClick={() => selectIncident(topAlert.incident_id!)}
              className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <span>View Incident</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
