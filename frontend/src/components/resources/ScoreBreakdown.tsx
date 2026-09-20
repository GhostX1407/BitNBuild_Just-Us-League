import React from 'react';
import { ScoreBreakdown as ScoreBreakdownType } from '../../types/domain';

interface ScoreBreakdownProps {
  score: number;
  breakdown: ScoreBreakdownType;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ score, breakdown }) => {
  const metrics = [
    { label: 'Proximity', val: breakdown.proximity, weight: '45%' },
    { label: 'Capability Fit', val: breakdown.capability, weight: '25%' },
    { label: 'Readiness', val: breakdown.readiness, weight: '15%' },
    { label: 'Load Balance', val: breakdown.load, weight: '15%' },
  ];

  return (
    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg space-y-2 select-none">
      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/60 font-medium">
        <span className="text-slate-600">Match Confidence:</span>
        <span className="text-emerald-700 font-bold font-mono">{(score * 100).toFixed(0)}% Score</span>
      </div>

      <div className="space-y-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                {m.label} <span className="text-slate-400 font-mono">({m.weight})</span>:
              </span>
              <span className="text-slate-800 font-mono font-medium">{(m.val * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, m.val * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
