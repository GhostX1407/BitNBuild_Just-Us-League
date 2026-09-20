import React from 'react';
import { Radio, Clock } from 'lucide-react';
import { AssignmentOut } from '../../types/domain';
import { cn } from '../../utils/format';

interface AssignmentListProps {
  assignments: AssignmentOut[];
}

export const AssignmentList: React.FC<AssignmentListProps> = ({ assignments }) => {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200/60 rounded-xl">
        No active units dispatched yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
        <Radio className="w-4 h-4 text-blue-600" />
        <span>Dispatched Units ({assignments.length})</span>
      </div>

      <div className="space-y-2">
        {assignments.map((asg) => (
          <div
            key={asg.id}
            className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  {asg.target_name || asg.requirement_key}
                </div>
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> ETA: {asg.eta_min} min
                  </span>
                  <span>·</span>
                  <span>Match: {(asg.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <span
              className={cn(
                'text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase',
                asg.status === 'arrived'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : asg.status === 'en_route'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              )}
            >
              {asg.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
