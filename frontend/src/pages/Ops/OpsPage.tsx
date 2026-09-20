import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, FileText, ChevronDown, ChevronUp,
  CheckCircle, Lightbulb, Send
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH = { 'x-role': 'dispatcher', 'Content-Type': 'application/json' };

interface HandoverResult {
  outgoing: string;
  incoming: string;
  notes: string;
  brief: string | null;
  watch_items: string[];
  ts: string;
}

export const HandoverPanel: React.FC = () => {
  const [form, setForm] = useState({
    outgoing: '',
    incoming: '',
    notes: '',
    critical_incidents: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<HandoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!form.outgoing.trim() || !form.incoming.trim() || !form.notes.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        outgoing: form.outgoing,
        incoming: form.incoming,
        notes: form.notes,
        critical_incidents: form.critical_incidents
          ? form.critical_incidents.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };
      const r = await window.fetch(`${API}/api/handover`, {
        method: 'POST', headers: AUTH, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setResult(await r.json());
      setForm({ outgoing: '', incoming: '', notes: '', critical_incidents: '' });
    } catch (e: any) {
      setError(e.message || 'Failed to submit handover');
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-violet-500" />
          Shift Handover
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Outgoing Dispatcher *</label>
            <input
              value={form.outgoing}
              onChange={e => setForm(f => ({ ...f, outgoing: e.target.value }))}
              placeholder="Name"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Incoming Dispatcher *</label>
            <input
              value={form.incoming}
              onChange={e => setForm(f => ({ ...f, incoming: e.target.value }))}
              placeholder="Name"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Handover Notes *</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={4}
            placeholder="Status of ongoing incidents, resource allocations, pending decisions…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none resize-none"
          />
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Critical Incident IDs (comma-separated)</label>
          <input
            value={form.critical_incidents}
            onChange={e => setForm(f => ({ ...f, critical_incidents: e.target.value }))}
            placeholder="uuid-1, uuid-2"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none"
          />
        </div>

        {error && <div className="text-xs text-red-600 mb-2">{error}</div>}

        <button
          onClick={submit}
          disabled={submitting || !form.outgoing.trim() || !form.incoming.trim() || !form.notes.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Generating Brief…' : 'Submit Handover'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-violet-50 rounded-xl border border-violet-200 shadow-sm p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-violet-600" />
            <div>
              <div className="font-semibold text-violet-800 text-sm">Handover Recorded</div>
              <div className="text-xs text-violet-600">{result.outgoing} → {result.incoming}</div>
            </div>
          </div>

          {result.brief && (
            <div className="bg-white rounded-lg p-3 border border-violet-100">
              <div className="text-xs text-violet-500 font-bold mb-1 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" /> AI Situation Brief
              </div>
              <div className="text-sm text-slate-700">{result.brief}</div>
            </div>
          )}

          {result.watch_items.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1.5">Watch Items</div>
              <ul className="space-y-1">
                {result.watch_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-violet-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AuditLog panel
// ---------------------------------------------------------------------------

interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  data: Record<string, any>;
}

export const AuditLogPanel: React.FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entityId, setEntityId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = entityId ? `?entity_id=${entityId}&limit=100` : '?limit=100';
      const r = await window.fetch(`${API}/api/audit${params}`, { headers: { 'x-role': 'dispatcher' } });
      if (r.ok) { setRows(await r.json()); setLoaded(true); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [entityId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700 text-sm">Audit Trail</span>
          {loaded && <span className="text-xs text-slate-400">({rows.length} events)</span>}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            placeholder="Filter by entity ID…"
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-300 outline-none w-44"
          />
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Click "Load" to view audit events
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No events found</div>
      ) : (
        <div className="max-h-96 overflow-auto divide-y divide-slate-50">
          {rows.map(row => (
            <div key={row.id} className="hover:bg-slate-50">
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <span className="text-[10px] text-slate-400 shrink-0 w-14">
                  {new Date(row.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                  {row.action}
                </span>
                <span className="text-xs text-slate-500 truncate">{row.actor}</span>
                <span className="text-xs text-slate-400 truncate ml-auto">{row.entity_id.slice(0, 8)}…</span>
                {expandedId === row.id
                  ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                }
              </button>
              {expandedId === row.id && (
                <div className="px-4 pb-3">
                  <pre className="text-[10px] text-slate-600 bg-slate-50 rounded p-2 overflow-x-auto max-h-32 border border-slate-100">
                    {JSON.stringify(row.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Combined Ops Page
// ---------------------------------------------------------------------------

export const OpsPage: React.FC = () => {
  const [tab, setTab] = useState<'handover' | 'audit'>('handover');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-600" />
          <h1 className="font-bold text-slate-800 text-lg">Ops Center</h1>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(['handover', 'audit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === t
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'handover' ? '⇄ Shift Handover' : '🗒 Audit Trail'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'handover' ? <HandoverPanel /> : <AuditLogPanel />}
      </div>
    </div>
  );
};
