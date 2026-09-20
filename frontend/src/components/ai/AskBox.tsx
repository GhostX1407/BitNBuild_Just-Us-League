import React, { useState } from 'react';
import { Bot, Sparkles, CornerDownLeft } from 'lucide-react';
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
    <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl space-y-2.5 shadow-sm select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Bot className="w-4 h-4 text-blue-600" />
          <span>Operational Intelligence Query</span>
        </div>
      </div>

      <form onSubmit={handleAsk} className="relative">
        <input
          type="text"
          placeholder="Ask ops questions (e.g. boat shortages, hospital beds...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
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
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-blue-600 animate-pulse font-mono">
          Querying situational telemetry...
        </div>
      )}

      {answer && !loading && (
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1 animate-in fade-in">
          <div className="flex items-center gap-1 text-[10px] font-mono text-blue-600 font-semibold uppercase">
            <Sparkles className="w-3 h-3" /> AI Synthesis
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans">{answer}</p>
        </div>
      )}
    </div>
  );
};
