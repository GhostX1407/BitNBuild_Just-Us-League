import React from 'react';
import { cn } from '../../utils/format';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'alert' | 'secondary' | 'ghost' | 'teal' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs font-medium rounded-lg',
    md: 'px-3.5 py-1.5 text-xs font-semibold rounded-xl',
    lg: 'px-4.5 py-2 text-sm font-semibold rounded-xl',
  }[size];

  const variantStyles = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 shadow-sm border border-slate-900 hover:shadow active:translate-y-0.5',
    alert:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm border border-rose-600 hover:shadow active:translate-y-0.5',
    teal:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border border-emerald-600 hover:shadow active:translate-y-0.5',
    blue:
      'bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-blue-600 hover:shadow active:translate-y-0.5',
    secondary:
      'bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 border border-slate-300 shadow-tactile hover:border-slate-400 active:translate-y-0.5',
    ghost:
      'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:translate-y-0.5',
  }[variant];

  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-sans transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none',
        sizeStyles,
        variantStyles,
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
