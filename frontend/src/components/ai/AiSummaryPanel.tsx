import React, { useState, useEffect } from 'react';
import { Bot, CheckSquare, Square, AlertCircle, Sparkles } from 'lucide-react';
import { IncidentOut, AiSummary, AiSop } from '../../types/domain';
import { api } from '../../services/api';

interface AiSummaryPanelProps {
  incident: IncidentOut;
}

export const AiSummaryPanel: React.FC<AiSummaryPanelProps> = ({ incident }) => {
  const [summaryData, setSummaryData] = useState<AiSummary | null>(null);
  const [sopData, setSopData] = useState<AiSop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([api.getAiSummary(incident.id), api.getAiSop(incident.id)]).then(
      ([sum, sop]) => {
        if (active) {
          setSummaryData(sum);
          setSopData(sop);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [incident.id]);

  const toggleChecklist = (idx: number) => {
    if (!sopData) return;
    const nextList = [...sopData.checklist];
    nextList[idx] = { ...nextList[idx], done: !nextList[idx].done };
    setSopData({ ...sopData, checklist: nextList });
  };

  if (loading) {
    return (
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-12 bg-slate-100 rounded w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with AI Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Bot className="w-4 h-4 text-blue-600" />
          <span>Operational AI Synthesis</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
          <Sparkles className="w-2.5 h-2.5" />
          {summaryData?.model || 'LLM Strict-JSON'}
        </span>
      </div>

      {/* Summary Narrative */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
        <p className="text-xs text-slate-700 leading-relaxed font-sans">
          {summaryData?.summary}
        </p>
      </div>

      {/* Perils */}
      {summaryData?.risks && summaryData.risks.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Key Operational Risks</span>
          </div>
          <ul className="text-xs text-rose-950 space-y-1 pl-5 list-disc font-sans">
            {summaryData.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Responder SOP Checklist */}
      {sopData?.checklist && (
        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Responder SOP Checklist
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {sopData.checklist.filter((c) => c.done).length}/{sopData.checklist.length} Complete
            </span>
          </div>

          <div className="space-y-1.5">
            {sopData.checklist.map((item, idx) => (
              <div
                key={idx}
                onClick={() => toggleChecklist(idx)}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  item.done
                    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
                }`}
              >
                {item.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <span className="text-xs leading-snug select-none">{item.step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
