import React from 'react';
import { Check } from 'lucide-react';
import { IncidentStatus } from '../../types/domain';
import { cn } from '../../utils/format';

interface StatusStepperProps {
  currentStatus: IncidentStatus;
  onStatusChange?: (newStatus: IncidentStatus) => void;
}

const STAGES: Array<{ key: IncidentStatus; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'en_route', label: 'En Route' },
  { key: 'on_scene', label: 'On Scene' },
  { key: 'contained', label: 'Contained' },
  { key: 'resolved', label: 'Resolved' },
];

export const StatusStepper: React.FC<StatusStepperProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="w-full py-2 select-none">
      <div className="flex items-center justify-between relative">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

        {/* Active Progress Line */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-slate-900 -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${(activeIdx / (STAGES.length - 1)) * 100}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <button
              key={stage.key}
              onClick={() => onStatusChange?.(stage.key)}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-200 border',
                  isPassed
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : isCurrent
                    ? 'bg-white border-slate-900 text-slate-900 ring-4 ring-slate-100 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-400'
                )}
              >
                {isPassed ? <Check className="w-3 h-3 stroke-[2.5]" /> : idx + 1}
              </div>

              <span
                className={cn(
                  'mt-1.5 text-[10px] font-medium transition-colors',
                  isCurrent
                    ? 'text-slate-900 font-semibold'
                    : isPassed
                    ? 'text-slate-700'
                    : 'text-slate-400'
                )}
              >
                {stage.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
