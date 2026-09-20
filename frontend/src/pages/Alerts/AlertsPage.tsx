import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  AlertOctagon,
  Clock,
  ArrowUpRight,
  Cpu,
  CheckCircle2,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useAlertsStore } from '../../store/alerts';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { formatRelativeTime } from '../../utils/time';
import { cn } from '../../utils/format';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const alerts = useAlertsStore((state) => state.alerts);
  const ackAlert = useAlertsStore((state) => state.ackAlert);
  const escalateAlert = useAlertsStore((state) => state.escalateAlert);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);
  const showToast = useUiStore((state) => state.showToast);

  const [filter, setFilter] = useState<'all' | 'open' | 'critical' | 'sensor' | 'ack'>('open');
  const [searchQuery, setSearchQuery] = useState('');

  const openCount = alerts.filter((a) => a.status === 'open').length;
  const criticalCount = alerts.filter((a) => a.kind === 'critical' || a.level >= 2).length;
  const sensorCount = alerts.filter((a) => a.kind === 'sensor').length;

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'open' && a.status !== 'open') return false;
    if (filter === 'critical' && a.kind !== 'critical' && a.level < 2) return false;
    if (filter === 'sensor' && a.kind !== 'sensor') return false;
    if (filter === 'ack' && a.status !== 'ack') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.message.toLowerCase().includes(q) ||
        a.rule.toLowerCase().includes(q) ||
        a.kind.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'critical':
        return <AlertOctagon className="w-4 h-4 text-rose-500" />;
      case 'delayed':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'escalation':
        return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
      case 'sensor':
        return <Cpu className="w-4 h-4 text-amber-500" />;
      default:
        return <BellRing className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleAck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ackAlert(id);
    showToast({
      title: 'Alert Acknowledged',
      message: 'Escalation timer paused. Operational log updated.',
      type: 'info',
    });
  };

  const handleEscalate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    escalateAlert(id);
    showToast({
      title: 'Alert Escalated',
      message: 'Incident escalated to Tier-2 EOC Command.',
      type: 'alert',
    });
  };

  const handleInspectIncident = (incidentId: string) => {
    selectIncident(incidentId);
    navigate('/console');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 select-none space-y-5">
      {/* Header & Metric Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900 leading-tight">
                Alerts & Escalation Feed
              </h1>
              <p className="text-xs text-slate-500 font-sans">
                Realtime IoT sensor breaches, SLA countdown warnings, and multi-agency escalations.
              </p>
            </div>
          </div>
        </div>

        {/* 3D Metric Stat Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-slate-500 font-medium">Open Alerts:</span>
            <span className="font-mono font-bold text-slate-900">{openCount}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 shadow-sm flex items-center gap-2 text-xs">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500 font-medium">Critical:</span>
            <span className="font-mono font-bold text-rose-600">{criticalCount}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 text-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-500 font-medium">Sensor Breaches:</span>
            <span className="font-mono font-bold text-blue-600">{sensorCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-tile">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter alerts by rule, keyword, or level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
          {(['open', 'critical', 'sensor', 'ack', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize',
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {f === 'open'
                ? `Active (${openCount})`
                : f === 'critical'
                ? 'Critical P1'
                : f === 'sensor'
                ? 'IoT Sensors'
                : f === 'ack'
                ? 'Acknowledged'
                : 'All Alerts'}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">
              No Alerts In This Category
            </h3>
            <p className="text-xs text-slate-400 font-sans max-w-sm mx-auto">
              All incident thresholds and sensor streams are currently operating within nominal safety margins.
            </p>
          </div>
        ) : (
          filteredAlerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                'p-4.5 bg-white border rounded-2xl transition-all duration-200 shadow-tile hover:shadow-tile-hover hover:-translate-y-0.5 space-y-3 flex flex-col justify-between text-left',
                a.kind === 'critical'
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : 'border-slate-200/90 hover:border-slate-300'
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
                      {getKindIcon(a.kind)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-900 capitalize block">
                        {a.kind} Trigger
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Rule: {a.rule}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-[10px] font-mono px-2 py-0.5 rounded-full font-bold',
                        a.level === 0 && 'bg-slate-100 text-slate-600',
                        a.level === 1 && 'bg-amber-50 text-amber-700 border border-amber-200',
                        a.level === 2 && 'bg-orange-50 text-orange-700 border border-orange-200',
                        a.level >= 3 && 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                      )}
                    >
                      Severity L{a.level}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatRelativeTime(a.created_at)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-sans leading-relaxed bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                  {a.message}
                </p>
              </div>

              {/* Action Buttons & Incident Link */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                {a.incident_id ? (
                  <button
                    onClick={() => handleInspectIncident(a.incident_id!)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer group"
                  >
                    <span>Inspect on Console</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400">
                    Citywide Broadcast
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {a.status === 'open' && (
                    <button
                      onClick={(e) => handleAck(a.id, e)}
                      className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 transition-colors cursor-pointer font-semibold shadow-xs"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEscalate(a.id, e)}
                    className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs hover:bg-rose-100 transition-colors cursor-pointer font-bold shadow-xs"
                  >
                    Escalate L{a.level + 1}
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
