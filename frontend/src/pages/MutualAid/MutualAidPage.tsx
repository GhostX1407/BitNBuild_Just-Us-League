import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Handshake, Plus, CheckCircle2, XCircle, Truck,
  Clock, Building2, Package, AlertTriangle, ArrowRight
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH = { 'x-role': 'dispatcher', 'Content-Type': 'application/json' };

interface MutualAid {
  id: string;
  incident_id?: string;
  agency: string;
  resource_type: string;
  qty: number;
  status: 'requested' | 'approved' | 'declined' | 'arrived';
  requested_by?: string;
  decided_by?: string;
  note?: string;
  created_at: string;
  decided_at?: string;
}

const STATUS_STYLES = {
  requested: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { badge: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  declined: { badge: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  arrived: { badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Truck className="w-3.5 h-3.5" /> },
};

export const MutualAidPage: React.FC = () => {
  const [items, setItems] = useState<MutualAid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  const [form, setForm] = useState({
    agency: '',
    resource_type: '',
    qty: '1',
    incident_id: '',
    note: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.fetch(`${API}/api/mutual-aid`, { headers: { 'x-role': 'dispatcher' } });
      if (r.ok) setItems(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.agency.trim() || !form.resource_type.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        agency: form.agency,
        resource_type: form.resource_type,
        qty: parseInt(form.qty) || 1,
        incident_id: form.incident_id || undefined,
        note: form.note || undefined,
      };
      const r = await window.fetch(`${API}/api/mutual-aid`, {
        method: 'POST', headers: AUTH, body: JSON.stringify(body),
      });
      if (r.ok) {
        setForm({ agency: '', resource_type: '', qty: '1', incident_id: '', note: '' });
        setShowForm(false);
        await load();
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const decide = async (id: string, status: string) => {
    setDeciding(id + status);
    try {
      await window.fetch(`${API}/api/mutual-aid/${id}/decide`, {
        method: 'PATCH',
        headers: AUTH,
        body: JSON.stringify({ status }),
      });
      await load();
    } catch { /* ignore */ }
    finally { setDeciding(null); }
  };

  const counts = {
    requested: items.filter(i => i.status === 'requested').length,
    approved: items.filter(i => i.status === 'approved').length,
    arrived: items.filter(i => i.status === 'arrived').length,
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Handshake className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-slate-800 text-lg">Mutual Aid</h1>
          <div className="flex items-center gap-2">
            {counts.requested > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                {counts.requested} pending
              </span>
            )}
            {counts.approved > 0 && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                {counts.approved} approved
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Request Aid
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
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                New Mutual Aid Request
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Agency *</label>
                  <input
                    value={form.agency}
                    onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
                    placeholder="e.g. NDRF Team 5"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Resource Type *</label>
                  <input
                    value={form.resource_type}
                    onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}
                    placeholder="e.g. Rescue boats"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    value={form.qty}
                    onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                    min="1"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Incident ID (optional)</label>
                  <input
                    value={form.incident_id}
                    onChange={e => setForm(f => ({ ...f, incident_id: e.target.value }))}
                    placeholder="Incident UUID"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Note</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting || !form.agency.trim() || !form.resource_type.trim()}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm animate-pulse">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <Handshake className="w-10 h-10 opacity-30" />
            <span className="text-sm">No mutual aid requests</span>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const sty = STATUS_STYLES[item.status] || STATUS_STYLES.requested;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sty.badge}`}>
                          {sty.icon}
                          {item.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-800 font-medium mb-1">
                        <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        {item.agency}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                        <Package className="w-4 h-4 text-slate-400 shrink-0" />
                        {item.qty}× {item.resource_type}
                      </div>
                      {item.note && <div className="text-xs text-slate-500 mt-1">{item.note}</div>}
                      {item.incident_id && (
                        <div className="text-xs text-slate-400 mt-0.5">Incident: {item.incident_id.slice(0, 8)}…</div>
                      )}
                    </div>

                    {item.status === 'requested' && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => decide(item.id, 'approved')}
                          disabled={deciding === item.id + 'approved'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => decide(item.id, 'declined')}
                          disabled={deciding === item.id + 'declined'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    )}
                    {item.status === 'approved' && (
                      <button
                        onClick={() => decide(item.id, 'arrived')}
                        disabled={deciding === item.id + 'arrived'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50 shrink-0"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Mark Arrived
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
