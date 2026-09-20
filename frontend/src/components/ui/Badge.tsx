import React from 'react';
import { cn } from '../../utils/format';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'p1' | 'p2' | 'p3' | 'p4' | 'default' | 'teal' | 'amber';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  pulse = false,
  ...props
}) => {
  const variantStyles = {
    p1: 'bg-rose-50 text-rose-700 border-rose-200',
    p2: 'bg-orange-50 text-orange-700 border-orange-200',
    p3: 'bg-amber-50 text-amber-700 border-amber-200',
    p4: 'bg-sky-50 text-sky-700 border-sky-200',
    teal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold tracking-tight border',
        variantStyles,
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
      )}
      {children}
    </span>
  );
};
