import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  AlertTriangle, 
  Clock, 
  Activity, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  Hash
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8001'; // Used 8001 based on our previous setup, adjust to 8000 if needed

export default function IncidentCard({ incident, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Destructure with fallbacks for safety
  const {
    id,
    title = 'Unknown Incident',
    category = 'Unknown',
    description = 'No description provided.',
    severity = 'Low',
    status = 'Pending',
    latitude,
    longitude,
    classification_reason
  } = incident || {};

  // Config for severity styling
  const severityConfig = {
    High: {
      border: 'border-l-rose-500',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      glow: 'shadow-[inset_4px_0_0_0_rgba(244,63,94,0.3)]',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />
    },
    Medium: {
      border: 'border-l-amber-500',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      glow: 'shadow-[inset_4px_0_0_0_rgba(245,158,11,0.3)]',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />
    },
    Low: {
      border: 'border-l-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      glow: 'shadow-[inset_4px_0_0_0_rgba(16,185,129,0.3)]',
      icon: <Activity className="w-3.5 h-3.5 mr-1" />
    }
  };

  const currentConfig = severityConfig[severity] || severityConfig.Low;

  // Handle Status Update
  const handleStatusUpdate = async (newStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedData = await response.json();
      
      // Notify parent to update the feed without a full reload
      if (onStatusChange) {
        // If the backend returns the full object, pass it. Otherwise, patch it locally.
        onStatusChange({ ...incident, status: newStatus, ...updatedData });
      }
    } catch (err) {
      setError('Failed to update status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Action Button based on current status
  const renderAction = () => {
    if (status === 'Resolved') {
      return (
        <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-100 font-medium text-sm">
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          Resolved
        </div>
      );
    }

    const isPending = status === 'Pending';
    const targetStatus = isPending ? 'Dispatching Unit' : 'Resolved';
    const btnText = isPending ? 'Dispatch Unit' : 'Mark Resolved';
    const Icon = isPending ? Activity : ShieldCheck;
    
    // Style adjustments depending on the action
    const btnStyles = isPending
      ? 'bg-slate-800 hover:bg-slate-700 text-white border-transparent'
      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent';

    return (
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {error && (
          <span className="text-xs text-rose-600 flex items-center bg-rose-50 px-2 py-1 rounded">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {error}
          </span>
        )}
        <button
          onClick={() => handleStatusUpdate(targetStatus)}
          disabled={isLoading}
          className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto ${btnStyles}`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Icon className="w-4 h-4 mr-2" />
          )}
          {isLoading ? 'Updating...' : btnText}
        </button>
      </div>
    );
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col ${currentConfig.border} border-l-4 ${currentConfig.glow}`}
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center text-xs font-semibold text-slate-400">
              <Hash className="w-3 h-3 mr-0.5" />
              INC-{id}
            </span>
            <h3 className="text-base font-semibold text-slate-800 line-clamp-1" title={title}>
              {title}
            </h3>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              {category}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide ${currentConfig.badge}`}>
              {currentConfig.icon}
              {severity}
            </span>
            <span className="flex items-center px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {status}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
          {description}
        </p>

        {/* AI Classification Reasoning */}
        {classification_reason && (
          <div className="bg-slate-50 border border-slate-100 rounded-md p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                AI Classification Insight
              </span>
            </div>
            <p className="text-xs text-slate-600 italic">"{classification_reason}"</p>
          </div>
        )}

        {/* Footer Row */}
        <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center text-xs text-slate-500 font-medium">
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {latitude !== undefined && longitude !== undefined ? (
              <span>{parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}</span>
            ) : (
              <span>Location unknown</span>
            )}
          </div>

          {/* Dynamic Workflow Actions */}
          {renderAction()}
        </div>
      </div>
    </motion.article>
  );
}
