import React, { useState } from 'react';
import {
  BellRing,
  AlertOctagon,
  Clock,
  ArrowUpRight,
  Cpu,
} from 'lucide-react';
import { useAlertsStore } from '../../store/alerts';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { formatRelativeTime } from '../../utils/time';
import { cn } from '../../utils/format';

export const AlertsPanel: React.FC = () => {
  const alerts = useAlertsStore((state) => state.alerts);
  const ackAlert = useAlertsStore((state) => state.ackAlert);
  const escalateAlert = useAlertsStore((state) => state.escalateAlert);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);
  const showToast = useUiStore((state) => state.showToast);

  const [filter, setFilter] = useState<'all' | 'open' | 'ack'>('open');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'open') return a.status === 'open';
    if (filter === 'ack') return a.status === 'ack';
    return true;
  });

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'critical':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />;
      case 'delayed':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'escalation':
        return <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />;
      case 'sensor':
        return <Cpu className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <BellRing className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const handleAck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ackAlert(id);
    showToast({
      title: 'Alert Acknowledged',
      message: 'Escalation timer suspended.',
      type: 'info',
    });
  };

  const handleEscalate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    escalateAlert(id);
    showToast({
      title: 'Alert Escalated',
      message: 'Escalated to higher tier authority.',
      type: 'alert',
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">
      {/* Panel Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <BellRing className="w-4 h-4 text-amber-500" />
          <span>Alerts & Escalations</span>
          <span className="text-slate-400 font-normal font-mono">({filteredAlerts.length})</span>
        </div>

        {/* Filter toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('open')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
              filter === 'open'
                ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            Open ({alerts.filter((a) => a.status === 'open').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
              filter === 'all'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Alerts Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            No active alerts in current view.
          </div>
        ) : (
          filteredAlerts.map((a) => (
            <div
              key={a.id}
              onClick={() => a.incident_id && selectIncident(a.incident_id)}
              className={cn(
                'p-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 transition-all cursor-pointer space-y-2 shadow-sm',
                a.kind === 'critical' && 'border-rose-200 bg-rose-50/20'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getKindIcon(a.kind)}
                  <span className="text-xs font-semibold text-slate-900 capitalize">
                    {a.kind}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                      a.level === 0 && 'bg-slate-100 text-slate-600',
                      a.level === 1 && 'bg-amber-50 text-amber-700 border border-amber-200',
                      a.level === 2 && 'bg-orange-50 text-orange-700 border border-orange-200',
                      a.level >= 3 && 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                    )}
                  >
                    L{a.level}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {formatRelativeTime(a.created_at)}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {a.message}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] font-mono text-slate-400">
                  {a.rule}
                </span>

                <div className="flex items-center gap-1.5">
                  {a.status === 'open' && (
                    <button
                      onClick={(e) => handleAck(a.id, e)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 transition-colors cursor-pointer font-medium"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEscalate(a.id, e)}
                    className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs hover:bg-rose-100 transition-colors cursor-pointer font-semibold"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
