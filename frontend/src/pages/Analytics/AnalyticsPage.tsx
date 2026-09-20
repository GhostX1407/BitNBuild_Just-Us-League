import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Clock,
  AlertOctagon,
  Calendar,
  Download,
  Filter,
  CheckCircle2,
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview>(MOCK_ANALYTICS.overview);
  const [types, setTypes] = useState<AnalyticsTypeCount[]>(MOCK_ANALYTICS.types);
  const [delays, setDelays] = useState<AnalyticsDelay>(MOCK_ANALYTICS.delays);
  const [shortages, setShortages] = useState<AnalyticsShortage[]>(MOCK_ANALYTICS.shortages);
  const [hotspots, setHotspots] = useState<AnalyticsHotspot[]>(MOCK_ANALYTICS.hotspots);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeSeries[]>(MOCK_ANALYTICS.timeseries);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | 'monsoon'>('24h');

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex-1 overflow-y-auto bg-slate-50/60 p-5 sm:p-7 select-none space-y-6"
    >
      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900 tracking-tight">
                Command Telemetry & Operational Analytics
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Real-time emergency telemetry, response latency verification, and resource fulfillment indices for Vadodara Smart City.
          </p>
        </div>

        {/* Filter Pills & Live Status */}
        <div className="flex items-center gap-3">
          <div className="inline-flex bg-slate-200/70 p-1 rounded-xl border border-slate-300/60 shadow-inner">
            <button
              type="button"
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === '24h'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              24h Window
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('monsoon')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === 'monsoon'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monsoon Peak
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Stream: Live Sync</span>
          </div>
        </div>
      </motion.div>

      {/* Hero Deduplication Efficiency Card */}
      <motion.div
        variants={itemVariants}
        className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        {/* Subtle Ambient Background Mesh */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                ResQGrid AI Engine
              </span>
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              <span className="text-xs text-white/60 font-sans">Multi-Channel Deduplication</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
              {overview.dedupe_ratio}x Reduction Factor Achieved
            </h2>
            <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-xl">
              Consolidated <span className="font-bold text-white">{overview.total_reports}</span> citizen reports, sensor anomalies, and dispatch calls into{' '}
              <span className="font-bold text-white">{overview.total_incidents}</span> unique, geocoded command incidents. Eliminates dispatch clutter by{' '}
              <span className="font-bold text-emerald-400">{Math.round((1 - overview.total_incidents / overview.total_reports) * 100)}%</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0 w-full md:w-auto">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-center flex-1 md:flex-initial">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Raw Ingest</div>
            <div className="text-xl font-mono font-bold text-white mt-0.5">{overview.total_reports}</div>
          </div>
          <div className="text-indigo-400 text-lg font-bold">→</div>
          <div className="p-3.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md text-center flex-1 md:flex-initial">
            <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-200">Active Incidents</div>
            <div className="text-xl font-mono font-bold text-white mt-0.5">{overview.total_incidents}</div>
          </div>
        </div>
      </motion.div>

      {/* KPI Overview Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Reports */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-200 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">
              Total Ingested Calls
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-tight">
            {overview.total_reports}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Multi-channel live sync</span>
          </div>
        </div>

        {/* Metric 2: SLA Compliance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-200 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">
              SLA Compliance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-600 tracking-tight">
            {overview.sla_compliance_pct}%
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target benchmark: 90.0%</span>
          </div>
        </div>

        {/* Metric 3: Avg Response Time */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-200 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">
              Average Arrival Time
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-sky-600 tracking-tight">
            {overview.avg_response_min} <span className="text-sm font-sans font-normal text-slate-500">min</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span>Ingest to wheels-on-ground</span>
          </div>
        </div>

        {/* Metric 4: Top Incident Class */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-200 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">
              Dominant Incident Class
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 capitalize tracking-tight truncate">
            {overview.top_type.replace(/_/g, ' ')}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Vishwamitri basin surge</span>
          </div>
        </div>
      </motion.div>

      {/* 4 Interactive Visual Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Distribution by Incident Type */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-300 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Distribution by Incident Classification
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Breakdown of categorized distress emergencies across all sectors
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Categorical Mix
            </span>
          </div>

          <TypeChart data={types} />

          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-center gap-2.5 shadow-xs">
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans leading-relaxed">
              <strong className="text-slate-900 font-semibold">Triage Insight:</strong> Severe waterlogging represents 38% of call volume. Vadodara North drainage lines are prioritized.
            </span>
          </div>
        </div>

        {/* Chart 2: Temporal Ingress & P1 Surges */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-300 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Temporal Ingress & P1 Critical Surges
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Hour-by-hour stream comparing total calls vs life-threatening P1 dispatches
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Continuous Stream
            </span>
          </div>

          <TimeSeriesChart data={timeseries} />

          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-center gap-2.5 shadow-xs">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans leading-relaxed">
              <strong className="text-slate-900 font-semibold">Surge Alert:</strong> Critical P1 spikes peak between 08:00 - 10:00 coinciding with high-tide river overflow and traffic hours.
            </span>
          </div>
        </div>

        {/* Chart 3: Response Delays by Priority */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-300 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Response Latency vs SLA by Priority
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Comparison of assignment latency vs physical unit arrival times across priorities
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Minutes to Scene
            </span>
          </div>

          <DelayChart data={delays} />

          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-center gap-2.5 shadow-xs">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans leading-relaxed">
              <strong className="text-slate-900 font-semibold">Latency Audit:</strong> Priority 1 calls meet 94.2% SLA compliance; P3 transport bottlenecks account for minor secondary delays.
            </span>
          </div>
        </div>

        {/* Chart 4: Resource Availability vs Deficits */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-300 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Resource Availability & Unmet Shortages
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Readiness inventory vs field equipment deficits needing municipal requisition
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Supply Shortages
            </span>
          </div>

          <ShortageChart data={shortages} />

          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-center gap-2.5 shadow-xs">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans leading-relaxed">
              <strong className="text-slate-900 font-semibold">Equipment Requisition:</strong> Submersible high-capacity drainage pumps and Level-A Hazmat gear have immediate 5-unit deficits.
            </span>
          </div>
        </div>
      </motion.div>

      {/* Vulnerable Hotspots Table Card */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover transition-all duration-300 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-heading font-bold text-slate-900">
              Geographic Vulnerability Clusters & Sector Risk
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Ranked analysis of geographic concentration, recurrence weight, and alert severity across Vadodara municipal wards
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
            100% Ward Coverage
          </span>
        </div>

        <HotspotTable data={hotspots} />
      </motion.div>
    </motion.div>
  );
};
