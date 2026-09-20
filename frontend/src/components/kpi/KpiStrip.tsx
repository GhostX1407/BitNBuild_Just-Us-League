import React from 'react';
import {
  Flame,
  AlertOctagon,
  Clock,
  ShieldCheck,
  BellRing,
  PackageX,
  Layers,
} from 'lucide-react';
import { useIncidentsStore } from '../../store/incidents';
import { useUnitsStore } from '../../store/units';
import { useAlertsStore } from '../../store/alerts';
import { cn } from '../../utils/format';

export const KpiStrip: React.FC = () => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const units = useUnitsStore((state) => state.units);
  const alerts = useAlertsStore((state) => state.alerts);

  const activeIncidents = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'closed'
  );
  const p1Count = incidents.filter((i) => i.priority === 'P1').length;
  const availableUnits = units.filter((u) => u.status === 'available').length;
  const openAlerts = alerts.filter((a) => a.status === 'open').length;
  const totalShortages = incidents.reduce(
    (acc, i) => acc + (i.shortages?.length || 0),
    0
  );
  const totalReports = incidents.reduce((acc, i) => acc + (i.report_count || 1), 0);
  const dedupeRatio = (totalReports / Math.max(1, incidents.length)).toFixed(1);

  const metrics = [
    {
      id: 'active',
      label: 'Active Incidents',
      value: activeIncidents.length,
      icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
      color: 'text-slate-900',
    },
    {
      id: 'p1',
      label: 'Critical P1',
      value: p1Count,
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />,
      color: p1Count > 0 ? 'text-rose-600 font-bold' : 'text-slate-500',
      badge: p1Count > 0 ? 'Surge' : undefined,
    },
    {
      id: 'response',
      label: 'Avg Response',
      value: '5.8m',
      icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
      color: 'text-slate-900',
    },
    {
      id: 'units',
      label: 'Units Ready',
      value: `${availableUnits} of ${units.length}`,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />,
      color: 'text-slate-900',
    },
    {
      id: 'alerts',
      label: 'Open Alerts',
      value: openAlerts,
      icon: <BellRing className="w-3.5 h-3.5 text-amber-500" />,
      color: openAlerts > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500',
    },
    {
      id: 'shortages',
      label: 'Shortages',
      value: totalShortages,
      icon: <PackageX className="w-3.5 h-3.5 text-rose-500" />,
      color: totalShortages > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500',
    },
    {
      id: 'dedupe',
      label: 'Dedupe Factor',
      value: `${dedupeRatio}x`,
      icon: <Layers className="w-3.5 h-3.5 text-indigo-500" />,
      color: 'text-indigo-600 font-bold',
    },
  ];

  return (
    <div className="h-11 bg-white border-b border-slate-200/80 px-5 flex items-center gap-7 overflow-x-auto select-none no-scrollbar shrink-0">
      {metrics.map((m) => (
        <div key={m.id} className="flex items-center gap-2 shrink-0">
          <span className="shrink-0">{m.icon}</span>
          <div className="flex items-baseline gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">
              {m.label}:
            </span>
            <span className={cn('font-semibold', m.color)}>
              {m.value}
            </span>
            {m.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                {m.badge}
              </span>
            )}
          </div>
          <span className="w-px h-3.5 bg-slate-200 ml-3 last:hidden" />
        </div>
      ))}
    </div>
  );
};
