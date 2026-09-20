import React, { useState, useCallback } from 'react';

import {
  X,
  Bot,
  Layers,
  Radio,
  History,
  SlidersHorizontal,
  MapPin,
  AlertTriangle,
  GitBranch,
  Play,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SlaCountdown } from './SlaCountdown';
import { StatusStepper } from './StatusStepper';
import { LinkedReports } from './LinkedReports';
import { MergeDialog } from './MergeDialog';
import { RecommendationPanel } from '../resources/RecommendationPanel';
import { AssignmentList } from '../resources/AssignmentList';
import { AiSummaryPanel } from '../ai/AiSummaryPanel';
import { IncidentOut, IncidentStatus } from '../../types/domain';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { formatTypeLabel, cn } from '../../utils/format';
import { formatRelativeTime } from '../../utils/time';

interface IncidentDrawerProps {
  incident: IncidentOut | null;
  onClose: () => void;
}

export const IncidentDrawer: React.FC<IncidentDrawerProps> = ({
  incident,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'resources' | 'ai' | 'reports' | 'history' | 'cascade' | 'replay'>('resources');
  const [isMergeOpen, setMergeOpen] = useState(false);
  const [isOverrideOpen, setOverrideOpen] = useState(false);

  // v2: cascade risk + replay state
  const [cascadeData, setCascadeData] = useState<any>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [replayData, setReplayData] = useState<any>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayStep, setReplayStep] = useState(0);

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const AUTH_H = { 'x-role': 'dispatcher' };

  const overrideIncident = useIncidentsStore((state) => state.overrideIncident);
  const showToast = useUiStore((state) => state.showToast);
  const currentUser = useUiStore((state) => state.currentUser);

  const loadCascade = useCallback(async () => {
    if (!incident) return;
    setCascadeLoading(true);
    try {
      const r = await window.fetch(`${API_BASE}/api/incidents/${incident.id}/cascade`, {
        method: 'POST', headers: AUTH_H,
      });
      if (r.ok) setCascadeData(await r.json());
    } catch { /* ignore */ }
    finally { setCascadeLoading(false); }
  }, [incident?.id]);

  const loadReplay = useCallback(async () => {
    if (!incident) return;
    setReplayLoading(true);
    try {
      const r = await window.fetch(`${API_BASE}/api/incidents/${incident.id}/replay`, { headers: AUTH_H });
      if (r.ok) { setReplayData(await r.json()); setReplayStep(0); }
    } catch { /* ignore */ }
    finally { setReplayLoading(false); }
  }, [incident?.id]);


  if (!incident) return null;

  const handleStatusChange = (newStatus: IncidentStatus) => {
    if (currentUser.role !== 'dispatcher' && currentUser.role !== 'team') {
      showToast({
        title: 'Dispatch Clearance Required',
        message: 'Incident lifecycle transitions are managed by Central EOC Dispatch.',
        type: 'warn',
      });
      return;
    }
    overrideIncident(incident.id, { status: newStatus });
    showToast({
      title: 'Status Updated',
      message: `${incident.code} status shifted to ${newStatus.toUpperCase()}`,
      type: 'info',
    });
  };

  const priorityVariant =
    incident.priority === 'P1'
      ? 'p1'
      : incident.priority === 'P2'
      ? 'p2'
      : incident.priority === 'P3'
      ? 'p3'
      : 'p4';

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-slate-200/80 shadow-xl overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={priorityVariant} pulse={incident.priority === 'P1'}>
              {incident.priority}
            </Badge>
            <span className="font-mono text-sm font-bold text-slate-900">
              {incident.code}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
              SEV {incident.severity}/5
            </span>
            {incident.escalated && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                L{incident.escalation_level} Escalated
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {currentUser.role === 'dispatcher' && (
              <button
                onClick={() => setOverrideOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Manual priority override (Central Dispatch Admin)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 font-sans leading-snug">
            {incident.title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {incident.area}
            </span>
            <span>·</span>
            <span>{formatTypeLabel(incident.type)}</span>
            <span>·</span>
            <span>{incident.people_affected} affected</span>
          </div>
        </div>

        {/* SLA Radial Ring & Status Stepper */}
        <div className="pt-2 border-t border-slate-200/60 space-y-3">
          <SlaCountdown slaDueAt={incident.sla_due_at} createdAt={incident.created_at} />
          <StatusStepper
            currentStatus={incident.status}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-white px-4 border-b border-slate-200/80 text-xs shrink-0">
        <button
          onClick={() => setActiveTab('resources')}
          className={cn(
            'flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer',
            activeTab === 'resources'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Dispatch & Units</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={cn(
            'flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer',
            activeTab === 'ai'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            'flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer',
            activeTab === 'reports'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Reports ({incident.report_count})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer',
            activeTab === 'history'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>

        <button
          onClick={() => { setActiveTab('cascade'); if (!cascadeData) loadCascade(); }}
          className={cn(
            'flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer',
            activeTab === 'cascade'
              ? 'border-rose-600 text-rose-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-rose-600'
          )}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Cascade</span>
        </button>

        <button
          onClick={() => { setActiveTab('replay'); if (!replayData) loadReplay(); }}
          className={cn(
            'flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer',
            activeTab === 'replay'
              ? 'border-violet-600 text-violet-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-violet-600'
          )}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Replay</span>
        </button>
      </div>


      {/* Drawer Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <RecommendationPanel incident={incident} />
            <AssignmentList assignments={incident.assignments} />
          </div>
        )}

        {activeTab === 'ai' && <AiSummaryPanel incident={incident} />}

        {activeTab === 'reports' && (
          <LinkedReports
            incident={incident}
            onOpenMergeDialog={currentUser.role === 'dispatcher' ? () => setMergeOpen(true) : undefined}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-900 mb-2">
              Decision Audit Ledger
            </div>
            {incident.decision_log.map((log, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-900">{log.action}</span>
                  <span className="font-mono text-[11px]">{formatRelativeTime(log.ts)}</span>
                </div>
                <p className="text-slate-600 text-xs font-sans">{log.reason}</p>
                {log.actor && (
                  <div className="text-[11px] text-slate-400 font-mono">By: {log.actor}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cascade' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-900">Cascading Risk Analysis</div>
              <button onClick={loadCascade} className="text-xs text-blue-600 hover:text-blue-800">↻ Refresh</button>
            </div>
            {cascadeLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing risks…
              </div>
            ) : cascadeData ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
                  cascadeData.overall_cascade_level === 'high' ? 'bg-red-50 border-red-200 text-red-800' :
                  cascadeData.overall_cascade_level === 'medium' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                  'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <GitBranch className="w-4 h-4" />
                  Cascade Level: {(cascadeData.overall_cascade_level || '').toUpperCase()}
                </div>
                {cascadeData.immediate_action && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    ⚡ {cascadeData.immediate_action}
                  </div>
                )}
                {(cascadeData.risks || []).map((risk: any, i: number) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{risk.risk}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        risk.probability === 'high' ? 'bg-red-100 text-red-700' :
                        risk.probability === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>{risk.probability}</span>
                    </div>
                    <div className="text-xs text-slate-600">{risk.mitigation}</div>
                  </div>
                ))}
                {cascadeData.nearby_active_count > 0 && (
                  <div className="text-xs text-slate-500">{cascadeData.nearby_active_count} nearby active incidents within 3km</div>
                )}
              </div>
            ) : (
              <button onClick={loadCascade} className="w-full py-4 text-xs text-blue-600 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50">
                Click to analyze cascading risks
              </button>
            )}
          </div>
        )}

        {activeTab === 'replay' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-900">Incident Timeline Replay</div>
              <button onClick={loadReplay} className="text-xs text-blue-600 hover:text-blue-800">↻ Reload</button>
            </div>
            {replayLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading timeline…
              </div>
            ) : replayData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setReplayStep(s => Math.max(0, s - 1))} className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200">◀</button>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, (replayData.snapshots?.length || 1) - 1)}
                    value={replayStep}
                    onChange={e => setReplayStep(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <button onClick={() => setReplayStep(s => Math.min((replayData.snapshots?.length || 1) - 1, s + 1))} className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200">▶</button>
                </div>
                <div className="text-xs text-slate-500 text-center">
                  Step {replayStep + 1} / {replayData.snapshots?.length || 0}
                </div>
                {replayData.snapshots?.[replayStep] && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded">{replayData.snapshots[replayStep].event}</span>
                      <span className="text-[10px] text-slate-500">{replayData.snapshots[replayStep].actor}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{new Date(replayData.snapshots[replayStep].ts || '').toLocaleString('en-IN')}</div>
                    <pre className="text-[10px] text-slate-600 bg-white rounded p-2 overflow-x-auto border border-violet-100 max-h-24">{JSON.stringify(replayData.snapshots[replayStep].data, null, 2)}</pre>
                  </div>
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(replayData.snapshots || []).map((snap: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setReplayStep(i)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        i === replayStep ? 'bg-violet-100 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <ChevronRight className="w-3 h-3 shrink-0" />
                      <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">{snap.event}</span>
                      <span className="truncate text-slate-500">{snap.actor}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={loadReplay} className="w-full py-4 text-xs text-violet-600 border border-dashed border-violet-200 rounded-lg hover:bg-violet-50">
                Click to load incident replay
              </button>
            )}
          </div>
        )}
      </div>


      {/* Merge Dialog Modal */}
      <MergeDialog
        currentIncident={incident}
        isOpen={isMergeOpen}
        onClose={() => setMergeOpen(false)}
      />

      {/* Manual Override Confirmation */}
      {isOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Manual Priority Override</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Manually adjust severity or priority for {incident.code}. This change is permanently audited.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="alert"
                size="sm"
                className="flex-1"
                onClick={() => {
                  overrideIncident(incident.id, { priority: 'P1', severity: 5, escalated: true });
                  setOverrideOpen(false);
                  showToast({ title: 'Escalated to P1', message: `${incident.code} raised to critical priority`, type: 'alert' });
                }}
              >
                Set to P1
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  overrideIncident(incident.id, { priority: 'P3', severity: 2 });
                  setOverrideOpen(false);
                  showToast({ title: 'Lowered to P3', message: `${incident.code} set to P3 priority`, type: 'info' });
                }}
              >
                Set to P3
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
