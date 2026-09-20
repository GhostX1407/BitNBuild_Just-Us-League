import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Droplets,
  Flame,
  Truck,
  Activity,
  Layers,
} from 'lucide-react';
import { KpiStrip } from '../../components/kpi/KpiStrip';
import { AlertBanner } from '../../components/alerts/AlertBanner';
import { IncidentQueue } from '../../components/incident/IncidentQueue';
import { LiveMap } from '../../components/map/LiveMap';
import { IncidentDrawer } from '../../components/incident/IncidentDrawer';
import { AlertsPanel } from '../../components/alerts/AlertsPanel';
import { AskBox } from '../../components/ai/AskBox';
import { SituationBrief } from '../../components/ai/SituationBrief';
import { useIncidentsStore } from '../../store/incidents';
import { realtimeManager } from '../../services/ws';
import { cn } from '../../utils/format';

export const ConsolePage: React.FC = () => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const selectedIncidentId = useIncidentsStore((state) => state.selectedIncidentId);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);

  const [showAiControls, setShowAiControls] = useState(false);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      {/* Alert Banner */}
      <AlertBanner />

      {/* KPI Stat Strip */}
      <KpiStrip />

      {/* Clean Demo Scenario Toolbar */}
      <div className="h-10 bg-white border-b border-slate-200/80 px-4 sm:px-5 flex items-center justify-between select-none shrink-0 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Simulate:
          </span>

          <button
            onClick={() => realtimeManager.playScenario('flood')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm transition-all cursor-pointer text-xs font-semibold shrink-0 active:translate-y-0.5"
          >
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            <span>Flood Overflow</span>
          </button>

          <button
            onClick={() => realtimeManager.playScenario('chemical_fire')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-sm transition-all cursor-pointer text-xs font-semibold shrink-0 active:translate-y-0.5"
          >
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>Chemical Fire</span>
          </button>

          <button
            onClick={() => realtimeManager.playScenario('pileup')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-sm transition-all cursor-pointer text-xs font-semibold shrink-0 active:translate-y-0.5"
          >
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            <span>Highway Pileup</span>
          </button>

          <button
            onClick={() => realtimeManager.injectSensorBreach()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-sm transition-all cursor-pointer text-xs font-medium shrink-0 hidden sm:inline-flex active:translate-y-0.5"
          >
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Sensor Breach</span>
          </button>

          <button
            onClick={() => realtimeManager.injectDuplicateBurst()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-sm transition-all cursor-pointer text-xs font-medium shrink-0 hidden md:inline-flex active:translate-y-0.5"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Dedupe Burst</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAiControls(!showAiControls)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs transition-all cursor-pointer font-semibold shadow-sm select-none active:translate-y-0.5',
              showAiControls
                ? 'bg-slate-900 text-white shadow ring-2 ring-slate-900/10'
                : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Ops Assist</span>
          </button>

          <button
            onClick={() => realtimeManager.resetSimulation()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all cursor-pointer text-xs font-medium select-none active:translate-y-0.5"
            title="Reset simulation to default state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Command Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Incident Queue */}
        <div className="w-80 md:w-96 h-full border-r border-slate-200/80 shrink-0 z-10 flex flex-col bg-white">
          <IncidentQueue />
        </div>

        {/* Center: Live Map Canvas */}
        <div className="flex-1 h-full relative overflow-hidden bg-slate-100">
          <LiveMap />

          {/* Floating AI Query & Brief Drawer */}
          {showAiControls && (
            <div className="absolute top-4 right-4 z-20 w-84 space-y-3 animate-in slide-in-from-top-3 duration-200">
              <SituationBrief />
              <AskBox />
            </div>
          )}
        </div>

        {/* Right: Drawer OR Alerts Feed */}
        <div className="w-[420px] xl:w-[460px] h-full border-l border-slate-200/80 shrink-0 z-10 hidden lg:flex flex-col bg-white">
          {selectedIncident ? (
            <IncidentDrawer
              incident={selectedIncident}
              onClose={() => selectIncident(null)}
            />
          ) : (
            <AlertsPanel />
          )}
        </div>
      </div>
    </div>
  );
};
