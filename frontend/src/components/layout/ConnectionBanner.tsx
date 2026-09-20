import React from 'react';
import { WifiOff, Cpu } from 'lucide-react';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/format';

export const ConnectionBanner: React.FC = () => {
  const wsConnected = useUiStore((state) => state.wsConnected);
  const isMockMode = useUiStore((state) => state.isMockMode);

  if (wsConnected && !isMockMode) return null;

  return (
    <div
      className={cn(
        'px-4 py-1.5 flex items-center justify-between text-xs font-mono border-b transition-colors select-none',
        isMockMode
          ? 'bg-amber-50 text-amber-900 border-amber-200/60'
          : 'bg-rose-50 text-rose-900 border-rose-200/60'
      )}
    >
      <div className="flex items-center gap-2">
        {isMockMode ? (
          <>
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium">DEMO DATA MODE — Vadodara Realtime Telemetry Simulation</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-medium">Connecting to live backend stream (/api/ws)...</span>
          </>
        )}
      </div>
      <span className="text-[11px] text-slate-500">
        Vadodara Grid
      </span>
    </div>
  );
};
