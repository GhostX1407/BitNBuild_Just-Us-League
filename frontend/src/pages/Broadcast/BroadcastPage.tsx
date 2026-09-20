import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Plus, X, AlertTriangle, Info, ShieldAlert, Globe, Clock, CheckCircle, Send
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AUTH = { 'x-role': 'dispatcher', 'Content-Type': 'application/json' };

interface Broadcast {
  id: string;
  title: string;
  body: string;
  body_hi?: string;
  body_gu?: string;
  severity: 'info' | 'warning' | 'critical';
  area?: string;
  active: boolean;
  created_by?: string;
  created_at: string;
  expires_at?: string;
}

const SEV_STYLES = {
  info: { badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Info className="w-4 h-4" />, bar: 'bg-blue-500' },
  warning: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="w-4 h-4" />, bar: 'bg-amber-500' },
  critical: { badge: 'bg-red-100 text-red-700 border-red-200', icon: <ShieldAlert className="w-4 h-4" />, bar: 'bg-red-600 animate-pulse' },
};

export const BroadcastPage: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    body: '',
    severity: 'info' as 'info' | 'warning' | 'critical',
    area: '',
    expires_minutes: '',
  });

  const load = useCallback(async (activeOnly = true) => {
    setLoading(true);
    try {
      const r = await window.fetch(`${API}/api/broadcasts?active_only=${activeOnly}`, { headers: AUTH });
      if (r.ok) setBroadcasts(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        body: form.body,
        severity: form.severity,
        area: form.area || undefined,
        expires_minutes: form.expires_minutes ? parseInt(form.expires_minutes) : undefined,
      };
      const r = await window.fetch(`${API}/api/broadcasts`, {
        method: 'POST', headers: AUTH, body: JSON.stringify(body),
      });
      if (r.ok) {
        setForm({ title: '', body: '', severity: 'info', area: '', expires_minutes: '' });
        setShowForm(false);
        await load();
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const deactivate = async (id: string) => {
    await window.fetch(`${API}/api/broadcasts/${id}/deactivate`, { method: 'PATCH', headers: AUTH });
    await load();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-blue-600" />
          <h1 className="font-bold text-slate-800 text-lg">Public Safety Broadcasts</h1>
          <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {broadcasts.filter(b => b.active).length} active
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" />
                  Create New Broadcast
                </h3>
                <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Flash Flood Warning – Waghodia Road"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Message *</label>
                  <textarea
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Broadcast message for citizens…"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Severity</label>
                    <select
                      value={form.severity}
                      onChange={e => setForm(f => ({ ...f, severity: e.target.value as any }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Area (optional)</label>
                    <input
                      value={form.area}
                      onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                      placeholder="e.g. Waghodia"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Expires (min)</label>
                    <input
                      type="number"
                      value={form.expires_minutes}
                      onChange={e => setForm(f => ({ ...f, expires_minutes: e.target.value }))}
                      placeholder="60"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  AI will auto-translate to Hindi & Gujarati
                </span>
                <button
                  onClick={submit}
                  disabled={submitting || !form.title.trim() || !form.body.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Publishing…' : 'Publish Broadcast'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Broadcast list */}
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading broadcasts…</div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
            <Radio className="w-10 h-10 opacity-30" />
            <span>No active broadcasts</span>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((bc) => {
              const sty = SEV_STYLES[bc.severity];
              const isExpanded = expandedId === bc.id;
              return (
                <motion.div
                  key={bc.id}
                  layout
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Severity bar */}
                  <div className={`h-1 w-full ${sty.bar}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sty.badge}`}>
                            {sty.icon}
                            {bc.severity.toUpperCase()}
                          </span>
                          {bc.area && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              📍 {bc.area}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(bc.created_at).toLocaleString('en-IN')}
                          </span>
                          {!bc.active && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Expired</span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-800 text-sm mb-1">{bc.title}</div>
                        <div className="text-sm text-slate-600 leading-relaxed">{bc.body}</div>

                        {/* Translations (expandable) */}
                        {(bc.body_hi || bc.body_gu) && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : bc.id)}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {isExpanded ? 'Hide' : 'Show'} translations (HI, GU)
                          </button>
                        )}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {bc.body_hi && (
                                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                    <div className="text-[10px] text-orange-600 font-bold mb-1">हिन्दी</div>
                                    <div className="text-sm text-slate-700">{bc.body_hi}</div>
                                  </div>
                                )}
                                {bc.body_gu && (
                                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                    <div className="text-[10px] text-green-600 font-bold mb-1">ગુજરાતી</div>
                                    <div className="text-sm text-slate-700">{bc.body_gu}</div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {bc.active && (
                        <button
                          onClick={() => deactivate(bc.id)}
                          className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
