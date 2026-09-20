import React, { useState } from 'react';
import { FileText, Sparkles, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import { AiBrief } from '../../types/domain';

export const SituationBrief: React.FC = () => {
  const [brief, setBrief] = useState<AiBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchBrief = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const data = await api.getAiBrief();
      setBrief(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-sm select-none">
      <div className="p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>District Situation Brief</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Sparkles className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchBrief}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Brief'}
          </Button>
          {brief && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {isOpen && brief && (
        <div className="p-4 space-y-3.5 border-t border-slate-100 bg-slate-50/50 animate-in fade-in">
          <div className="text-xs text-slate-700 leading-relaxed font-sans p-3.5 bg-white border border-slate-200/70 rounded-lg">
            {brief.brief}
          </div>

          {/* Key Perils */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Primary Sector Risks</span>
            </div>
            <ul className="text-xs text-rose-950 space-y-0.5 pl-5 list-disc font-sans">
              {brief.top_risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Reinforcements */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Recommended Reinforcements</span>
            </div>
            <ul className="text-xs text-emerald-950 space-y-0.5 pl-5 list-disc font-sans">
              {brief.reinforcement.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
