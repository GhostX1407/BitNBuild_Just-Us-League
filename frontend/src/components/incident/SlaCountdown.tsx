import React, { useState, useEffect } from 'react';
import { computeSlaCountdown } from '../../utils/time';
import { cn } from '../../utils/format';

interface SlaCountdownProps {
  slaDueAt: string;
  createdAt?: string;
  className?: string;
}

export const SlaCountdown: React.FC<SlaCountdownProps> = ({
  slaDueAt,
  createdAt,
  className,
}) => {
  const [slaStatus, setSlaStatus] = useState(() =>
    computeSlaCountdown(slaDueAt, createdAt)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSlaStatus(computeSlaCountdown(slaDueAt, createdAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [slaDueAt, createdAt]);

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (slaStatus.percentage / 100) * circumference;

  const ringColor = slaStatus.isBreached
    ? '#EF4444'
    : slaStatus.percentage < 25
    ? '#F59E0B'
    : '#10B981';

  return (
    <div className={cn('flex items-center gap-3.5 select-none', className)}>
      {/* Circular Radial Ring */}
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        <svg className="w-12 h-12 -rotate-90 transform">
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="#F1F5F9"
            strokeWidth="3.5"
            fill="transparent"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke={ringColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'font-mono text-xs font-bold',
              slaStatus.isBreached ? 'text-rose-600 font-bold' : 'text-slate-800'
            )}
          >
            {slaStatus.formatted.split(' ')[0]}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-[11px] text-slate-500 font-medium">
          SLA Response Window
        </span>
        <span
          className={cn(
            'text-xs font-semibold',
            slaStatus.isBreached ? 'text-rose-600' : 'text-slate-900'
          )}
        >
          {slaStatus.isBreached ? 'SLA Breached — Escalation Triggered' : 'On Schedule'}
        </span>
      </div>
    </div>
  );
};
