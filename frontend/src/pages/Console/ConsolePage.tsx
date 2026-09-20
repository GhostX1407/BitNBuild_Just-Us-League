import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  AlertOctagon,
  Sparkles,
  Sliders,
  Layers,
  ChevronRight,
  Flame,
  Clock,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  Radio,
} from 'lucide-react';
import { IncidentQueue } from '../../components/incident/IncidentQueue';
import { LiveMap } from '../../components/map/LiveMap';
import { IncidentDrawer } from '../../components/incident/IncidentDrawer';
import { AskBox } from '../../components/ai/AskBox';
import { SituationBrief } from '../../components/ai/SituationBrief';
import { WeatherWidget } from '../../components/weather/WeatherWidget';
import { useIncidentsStore } from '../../store/incidents';
import { useAlertsStore } from '../../store/alerts';
import { useUnitsStore } from '../../store/units';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/format';

export const ConsolePage: React.FC = () => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const selectedIncidentId = useIncidentsStore((state) => state.selectedIncidentId);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);

  const alerts = useAlertsStore((state) => state.alerts);
  const units = useUnitsStore((state) => state.units);
  const currentUser = useUiStore((state) => state.currentUser);

  const [isQueueOpen, setQueueOpen] = useState(true);
  const [showAiControls, setShowAiControls] = useState(false);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;

  // Live Metrics
  const activeIncidents = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'closed'
  );
  const p1Count = incidents.filter((i) => i.priority === 'P1').length;
  const availableUnits = units.filter((u) => u.status === 'available').length;
  const openAlerts = alerts.filter((a) => a.status === 'open');
  const criticalAlerts = openAlerts.filter((a) => a.kind === 'critical' || a.level >= 2);
  const topCriticalAlert = criticalAlerts[0] || null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative select-none">
      {/* Sleek Minimal Apple-style Executive 3D Header Ribbon */}
      <div className="h-11 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 shadow-xs text-xs">
        {/* Left: Critical Alert Indicator OR Nominal Status */}
        <div className="flex items-center gap-2 min-w-0">
          {topCriticalAlert ? (
            <NavLink
              to="/alerts"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-50 to-rose-100/70 text-rose-800 border border-rose-300 text-xs font-semibold hover:bg-rose-100 transition-all shadow-xs animate-pulse truncate group"
              title={topCriticalAlert.message}
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span className="truncate max-w-[190px] sm:max-w-[320px]">
                [{criticalAlerts.length} Critical] {topCriticalAlert.message}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </NavLink>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300/80 text-xs font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-heading font-bold">Grid Nominal</span>
              <span className="text-[10px] text-emerald-600 hidden md:inline">· All Sectors Monitored</span>
            </div>
          )}
        </div>

        {/* Center: Minimal 3D Executive Metric Stat Pills (Matching Analytics Colors) */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 rounded-full border border-slate-200/70 shadow-inner text-[11px] font-mono">
          {/* Active Incidents: Amber Gold */}
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-slate-800 font-bold shadow-xs border border-slate-200/60">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>{activeIncidents.length} Active</span>
          </span>

          {/* P1 Critical: Ruby Carmine */}
          {p1Count > 0 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-bold shadow-xs animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>{p1Count} P1 Critical</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-slate-500 font-medium shadow-xs border border-slate-200/60">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>0 P1</span>
            </span>
          )}

          {/* Available Units: Radiant Emerald */}
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-slate-800 font-medium shadow-xs border border-slate-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-emerald-700">{availableUnits} Ready</span>
          </span>

          {/* Average Latency: Horizon Cyan */}
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-slate-800 font-medium shadow-xs border border-slate-200/60">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-bold text-sky-700">5.8m Avg ETA</span>
          </span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Alerts Feed Shortcut with Amber Gradient Badge */}
          <NavLink
            to="/alerts"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs transition-all hover:scale-102 active:scale-98',
              openAlerts.length > 0
                ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            )}
            title="Open dedicated Alerts & Escalation feed"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-600" />
            <span>Alerts</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/70 text-amber-900 font-bold">
              {openAlerts.length}
            </span>
          </NavLink>

          {/* Live Weather Risk compact widget */}
          <div className="hidden lg:block">
            <WeatherWidget compact />
          </div>

          {/* Dedicated Simulator Shortcut for Admin with Violet Accent */}
          {currentUser.role === 'dispatcher' && (
            <NavLink
              to="/simulator"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 text-xs font-medium shadow-xs transition-all hover:scale-102 active:scale-98"
              title="Open full Chaos & Stress Testing Simulator"
            >
              <Sliders className="w-3.5 h-3.5 text-violet-600" />
              <span className="hidden sm:inline">Simulator</span>
            </NavLink>
          )}

          {/* AI Ops Assist Toggle with Luminous Gradient */}
          <button
            onClick={() => setShowAiControls(!showAiControls)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs transition-all hover:scale-102 active:scale-98 cursor-pointer',
              showAiControls
                ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-400/40 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            )}
            title="Toggle AI Ops Situation Brief & Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Assist</span>
          </button>

          {/* Incident Queue Toggle (Full Map Mode) */}
          <button
            onClick={() => setQueueOpen(!isQueueOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-medium shadow-xs transition-all hover:scale-102 active:scale-98 cursor-pointer"
            title={isQueueOpen ? 'Collapse Queue for full-screen map' : 'Expand Incident Queue'}
          >
            {isQueueOpen ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline font-medium">Full Map</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline font-medium">Queue</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Command Workspace Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Collapsible Incident Queue with Smooth Animation */}
        <AnimatePresence initial={false}>
          {isQueueOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 345, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="h-full border-r border-slate-200/80 shrink-0 z-10 flex flex-col bg-white shadow-sm overflow-hidden"
            >
              <div className="w-[345px] h-full flex flex-col">
                <IncidentQueue />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Expansive Full Map Canvas */}
        <div className="flex-1 h-full relative overflow-hidden bg-slate-100">
          <LiveMap />

          {/* Floating AI Query & Brief Overlay Drawer with Smooth Spring Animation */}
          <AnimatePresence>
            {showAiControls && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-4 right-4 z-20 w-88 space-y-3"
              >
                <SituationBrief />
                <AskBox />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Slide-Over Incident Inspector Drawer with Spring Entrance */}
        <AnimatePresence>
          {selectedIncident && (
            <motion.div
              initial={{ x: '100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.8 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="w-[420px] xl:w-[460px] h-full border-l border-slate-200/80 shrink-0 z-30 flex flex-col bg-white shadow-2xl overflow-hidden"
            >
              <IncidentDrawer
                incident={selectedIncident}
                onClose={() => selectIncident(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
