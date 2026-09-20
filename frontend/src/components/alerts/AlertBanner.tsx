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
    <div className="bg-rose-50 border-b border-rose-200 px-5 py-2 flex items-center justify-between animate-in slide-in-from-top select-none shrink-0">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <span className="p-1 rounded-md bg-rose-600 text-white shrink-0">
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
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors cursor-pointer"
          >
            <span>View Incident</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
