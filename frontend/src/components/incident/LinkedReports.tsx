import React from 'react';
import {
  FileText,
  GitMerge,
  Split,
  MessageSquare,
  Radio,
  Cpu,
  User,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { IncidentOut } from '../../types/domain';
import { useUiStore } from '../../store/ui';
import { formatRelativeTime } from '../../utils/time';
import { INITIAL_REPORTS } from '../../services/mock';

interface LinkedReportsProps {
  incident: IncidentOut;
  onOpenMergeDialog: () => void;
}

export const LinkedReports: React.FC<LinkedReportsProps> = ({
  incident,
  onOpenMergeDialog,
}) => {
  const showToast = useUiStore((state) => state.showToast);
  const reports = INITIAL_REPORTS[incident.id] || [];

  const getSourceIcon = (src: string) => {
    switch (src) {
      case 'citizen':
        return <User className="w-3.5 h-3.5 text-blue-600" />;
      case 'call':
        return <MessageSquare className="w-3.5 h-3.5 text-amber-600" />;
      case 'sensor':
        return <Cpu className="w-3.5 h-3.5 text-rose-600" />;
      case 'field':
        return <Radio className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const handleSplit = (reportId: string) => {
    showToast({
      title: 'Report Separated',
      message: `Report ${reportId} extracted into new incident.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Consolidated Reports ({incident.report_count})</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<GitMerge className="w-3.5 h-3.5 text-indigo-600" />}
          onClick={onOpenMergeDialog}
        >
          Merge Related
        </Button>
      </div>

      <div className="space-y-2.5">
        {reports.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-400">
            Primary report logged. No secondary reports merged yet.
          </div>
        ) : (
          reports.map((rep) => (
            <div
              key={rep.id}
              className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 hover:border-slate-300 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getSourceIcon(rep.source)}
                  <span className="text-xs font-semibold text-slate-900 capitalize">
                    {rep.source}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                    {(rep.reliability * 100).toFixed(0)}% Conf
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatRelativeTime(rep.created_at)}
                  </span>
                  <button
                    onClick={() => handleSplit(rep.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Split report"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {rep.text}
              </p>

              {rep.location_text && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Location: {rep.location_text}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
