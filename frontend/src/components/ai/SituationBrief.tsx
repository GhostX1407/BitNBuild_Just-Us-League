import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xl select-none"
    >
      <div className="p-3.5 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-bold text-white tracking-wide">
            EOC Situation Brief
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={fetchBrief}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synthesizing...' : 'Generate Brief'}</span>
          </button>
          {brief && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && brief && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="p-3.5 space-y-3 border-t border-slate-200/60 bg-slate-50/70 text-xs"
          >
            <div className="text-slate-700 leading-relaxed font-sans p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              {brief.brief}
            </div>

            {/* Key Perils */}
            <div className="p-3 bg-rose-50/90 border border-rose-200/90 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Primary Sector Risks</span>
              </div>
              <ul className="text-xs text-rose-950 space-y-0.5 pl-4 list-disc font-sans">
                {brief.top_risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Reinforcements */}
            <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recommended Reinforcements</span>
              </div>
              <ul className="text-xs text-emerald-950 space-y-0.5 pl-4 list-disc font-sans">
                {brief.reinforcement.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
