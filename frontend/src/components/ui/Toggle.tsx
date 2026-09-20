import React from 'react';
import { cn } from '../../utils/format';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
}) => {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative rounded-full transition-colors duration-200 border border-slate-300',
          size === 'sm' ? 'w-8 h-4' : 'w-10 h-5',
          checked ? 'bg-slate-900 border-slate-900' : 'bg-slate-200'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 rounded-full transition-transform duration-200 bg-white shadow-sm',
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
            checked ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0.5'
          )}
        />
      </div>
      {label && <span className="text-xs text-slate-600 font-medium">{label}</span>}
    </label>
  );
};
