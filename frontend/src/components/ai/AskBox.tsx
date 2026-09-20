import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, CornerDownLeft, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export const AskBox: React.FC = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await api.queryAi(query);
      setAnswer(res.answer);
    } catch (err) {
      setAnswer('Unable to query operational intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'Which areas need rescue boats?',
    'What is SSG Hospital bed status?',
    'Makarpura chemical fire update?',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="p-3.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl space-y-3 shadow-2xl select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-bold">Operational AI Dispatch Assistant</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
          GPT Triage
        </span>
      </div>

      <form onSubmit={handleAsk} className="relative">
        <input
          type="text"
          placeholder="Ask operational questions (e.g. boat shortages, beds...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-3.5 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:bg-transparent disabled:text-slate-400 transition-all cursor-pointer shadow-xs"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CornerDownLeft className="w-3 h-3" />}
        </button>
      </form>

      {!answer && !loading && (
        <div className="flex flex-wrap items-center gap-1.5">
          {sampleQuestions.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                setTimeout(() => handleAsk(), 50);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-transparent text-slate-600 transition-all cursor-pointer shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-700 animate-pulse font-mono flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Synthesizing citywide geospatial telemetry...</span>
        </div>
      )}

      <AnimatePresence>
        {answer && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 shadow-xs"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-700 font-bold uppercase">
              <Sparkles className="w-3 h-3" /> AI Synthesis Summary
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
