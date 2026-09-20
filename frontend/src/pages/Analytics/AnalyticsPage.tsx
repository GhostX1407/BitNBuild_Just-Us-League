import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TypeChart } from '../../components/charts/TypeChart';
import { TimeSeriesChart } from '../../components/charts/TimeSeriesChart';
import { DelayChart } from '../../components/charts/DelayChart';
import { ShortageChart } from '../../components/charts/ShortageChart';
import { HotspotTable } from '../../components/charts/HotspotTable';
import { api } from '../../services/api';
import {
  AnalyticsOverview,
  AnalyticsTypeCount,
  AnalyticsDelay,
  AnalyticsShortage,
  AnalyticsHotspot,
  AnalyticsTimeSeries,
} from '../../types/domain';
import { MOCK_ANALYTICS } from '../../services/mock';

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview>(MOCK_ANALYTICS.overview);
  const [types, setTypes] = useState<AnalyticsTypeCount[]>(MOCK_ANALYTICS.types);
  const [delays, setDelays] = useState<AnalyticsDelay>(MOCK_ANALYTICS.delays);
  const [shortages, setShortages] = useState<AnalyticsShortage[]>(MOCK_ANALYTICS.shortages);
  const [hotspots, setHotspots] = useState<AnalyticsHotspot[]>(MOCK_ANALYTICS.hotspots);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeSeries[]>(MOCK_ANALYTICS.timeseries);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview(),
      api.getAnalyticsTypes(),
      api.getAnalyticsDelays(),
      api.getAnalyticsShortages(),
      api.getAnalyticsHotspots(),
      api.getAnalyticsTimeSeries(),
    ]).then(([o, t, d, s, h, ts]) => {
      if (o) setOverview(o);
      if (t) setTypes(t);
      if (d) setDelays(d);
      if (s) setShortages(s);
      if (h) setHotspots(h);
      if (ts) setTimeseries(ts);
    });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 select-none space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-900" />
            <h1 className="text-xl font-heading font-bold text-slate-900">
              Operational Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Realtime performance metrics across Vadodara emergency response operations.
          </p>
        </div>

        {/* Highlight Deduplication Factor */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3.5 shadow-sm">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Deduplication Efficiency
            </div>
            <div className="text-lg font-mono font-bold text-indigo-600">
              {overview.dedupe_ratio}x Reduction
            </div>
            <div className="text-[10px] text-slate-400">
              {overview.total_reports} reports consolidated into {overview.total_incidents} incidents
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">
            Total Ingested Reports
          </span>
          <div className="text-2xl font-mono font-bold text-slate-900">
            {overview.total_reports}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            Multi-channel feeds
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">
            SLA Compliance
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600">
            {overview.sla_compliance_pct}%
          </div>
          <span className="text-[11px] text-slate-400">
            Across all priorities
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">
            Average Response Time
          </span>
          <div className="text-2xl font-mono font-bold text-blue-600">
            {overview.avg_response_min} min
          </div>
          <span className="text-[11px] text-slate-400">
            From ingest to arrival
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">
            Top Incident Type
          </span>
          <div className="text-2xl font-mono font-bold text-slate-900 capitalize">
            {overview.top_type}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">
            Vishwamitri basin surge
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Type Distribution */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Distribution by Incident Type
            </span>
            <span className="text-xs text-slate-400">Type Mix</span>
          </div>
          <TypeChart data={types} />
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>AI Insight: Flooding accounts for 38% of all emergency calls during monsoon months.</span>
          </div>
        </div>

        {/* Temporal Surge Patterns */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Temporal Incident Ingress & P1 Critical Surges
            </span>
            <span className="text-xs text-slate-400">Timeline</span>
          </div>
          <TimeSeriesChart data={timeseries} />
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>AI Insight: Critical P1 surges peak during morning industrial and commute transitions.</span>
          </div>
        </div>

        {/* Response Delays by Priority */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Response Latency vs SLA by Priority
            </span>
            <span className="text-xs text-slate-400">Minutes</span>
          </div>
          <DelayChart data={delays} />
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>AI Insight: P1 priority maintains 94.2% SLA compliance; non-critical transport causes P3 delays.</span>
          </div>
        </div>

        {/* Resource Shortages Demand vs Supply */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Resource Availability & Unmet Shortages
            </span>
            <span className="text-xs text-rose-600 font-medium">Deficits</span>
          </div>
          <ShortageChart data={shortages} />
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>AI Insight: Submersible drainage pumps and Hazmat Level-A suits represent key requisition priorities.</span>
          </div>
        </div>
      </div>

      {/* Vulnerable Hotspots Table */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900">
            Geographic Vulnerability Clusters
          </span>
          <span className="text-xs text-slate-400">Vadodara Wards</span>
        </div>
        <HotspotTable data={hotspots} />
      </div>
    </div>
  );
};
