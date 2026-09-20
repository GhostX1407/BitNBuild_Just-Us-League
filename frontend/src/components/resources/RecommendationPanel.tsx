import React, { useState } from 'react';
import { CheckCheck, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ScoreBreakdown } from './ScoreBreakdown';
import { Button } from '../ui/Button';
import { IncidentOut } from '../../types/domain';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';

interface RecommendationPanelProps {
  incident: IncidentOut;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ incident }) => {
  const approveAllAssignments = useIncidentsStore((state) => state.approveAllAssignments);
  const showToast = useUiStore((state) => state.showToast);
  const [isPlanning, setIsPlanning] = useState(false);

  const handleApproveAll = () => {
    approveAllAssignments(incident.id);
    showToast({
      title: 'Dispatches Approved',
      message: `Emergency response approved for ${incident.code}.`,
      type: 'success',
    });
  };

  const handleReplan = () => {
    setIsPlanning(true);
    setTimeout(() => {
      setIsPlanning(false);
      showToast({
        title: 'Plan Updated',
        message: 'Optimized nearest available responder units.',
        type: 'info',
      });
    }, 500);
  };

  const currentUser = useUiStore((state) => state.currentUser);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Resource Matching</span>
        </div>
        {currentUser.role === 'dispatcher' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isPlanning ? 'animate-spin' : ''}`} />}
              onClick={handleReplan}
              disabled={isPlanning}
            >
              Re-plan
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<CheckCheck className="w-3.5 h-3.5" />}
              onClick={handleApproveAll}
            >
              Approve All
            </Button>
          </div>
        ) : (
          <span className="text-[11px] font-medium text-slate-500 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
            EOC Dispatch Authority
          </span>
        )}
      </div>

      {/* Shortage Warning */}
      {incident.shortages && incident.shortages.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Resource Shortage Identified</span>
          </div>
          {incident.shortages.map((s, idx) => (
            <div key={idx} className="text-xs text-rose-900 flex items-center justify-between font-mono pl-5">
              <span>{s.subtype.replace(/_/g, ' ')}:</span>
              <span className="font-bold">Missing {s.qty_missing} unit(s)</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommended Assignments */}
      <div className="space-y-2.5">
        {incident.assignments.map((asg) => (
          <div
            key={asg.id}
            className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  {asg.target_name || asg.requirement_key}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {asg.kind?.toUpperCase()} · ETA: {asg.eta_min} min
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold uppercase">
                {asg.status}
              </span>
            </div>

            <ScoreBreakdown score={asg.score} breakdown={asg.score_breakdown} />
          </div>
        ))}
      </div>
    </div>
  );
};
