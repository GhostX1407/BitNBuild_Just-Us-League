import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/format';

export const Toast: React.FC = () => {
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);

  if (!toast) return null;

  const icons = {
    info: <Info className="w-4 h-4 text-blue-600" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    warn: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    alert: <AlertCircle className="w-4 h-4 text-rose-600" />,
  };

  const type = toast.type || 'info';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-xl">
        <span className="shrink-0 mt-0.5">{icons[type]}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-900">
            {toast.title}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">
            {toast.message}
          </div>
        </div>
        <button
          onClick={clearToast}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
