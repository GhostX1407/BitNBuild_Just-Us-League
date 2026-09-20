import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  AlertTriangle,
  Cpu,
  Layers,
  Clock,
  Radio,
  Activity,
  Sparkles,
  Flame,
  Droplets,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { realtimeManager } from '../../services/ws';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/format';

export const SimulatorPage: React.FC = () => {
  const isSimRunning = useUiStore((state) => state.isSimRunning);
  const activeScenario = useUiStore((state) => state.activeScenario);
  const [logMessages, setLogMessages] = useState<Array<{ ts: string; text: string }>>([
    { ts: '14:00:00', text: 'ResQGrid simulation harness active in Vadodara operational sector.' },
    { ts: '14:02:15', text: 'Ambient background telemetry active across 5 IoT river/gas sensors.' },
  ]);

  useEffect(() => {
    const handleEvent = (data: any) => {
      setLogMessages((prev) => [
        {
          ts: new Date().toLocaleTimeString(),
          text: `EVENT: ${JSON.stringify(data).slice(0, 95)}...`,
        },
        ...prev.slice(0, 30),
      ]);
    };

    realtimeManager.on('alert.new', handleEvent);
    realtimeManager.on('incident.upsert', handleEvent);
    return () => {
      realtimeManager.off('alert.new', handleEvent);
      realtimeManager.off('incident.upsert', handleEvent);
    };
  }, []);

  const triggerScenario = (name: 'flood' | 'chemical_fire' | 'pileup') => {
    realtimeManager.playScenario(name);
    setLogMessages((prev) => [
      {
        ts: new Date().toLocaleTimeString(),
        text: `TRIGGERED: Scenario ${name.toUpperCase()} launched on live testbed.`,
      },
      ...prev,
    ]);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 select-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate-900" />
            <h1 className="text-xl font-heading font-bold text-slate-900">
              Emergency Simulation Cockpit
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Test multi-source deduplication, sensor alerts, and automated fleet dispatch scenarios.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={() => realtimeManager.resetSimulation()}
        >
          Reset Simulation
        </Button>
      </div>

      {/* Scripted Scenarios Grid (3D Tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scenario 1: Flood */}
        <Card
          elevation="raised"
          className={cn(
            'p-5 space-y-4 shadow-tile',
            activeScenario === 'flood' ? 'ring-2 ring-blue-500' : ''
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Scenario 01 · Natural Disaster
            </span>
            {activeScenario === 'flood' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold animate-pulse">
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900">
                Vishwamitri River Overflow
              </h2>
              <span className="text-[11px] text-slate-400">Sayaji Baug Zoo & Bridge</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            Water level reaches 32ft trigger. Dispatches SDRF inflatable boats, creates evacuation corridors, and auto-merges duplicate 112 calls.
          </p>

          <Button
            variant="blue"
            className="w-full"
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={() => triggerScenario('flood')}
          >
            Launch Flood Scenario
          </Button>
        </Card>

        {/* Scenario 2: Chemical Fire */}
        <Card
          elevation="raised"
          className={cn(
            'p-5 space-y-4 shadow-tile',
            activeScenario === 'chemical_fire' ? 'ring-2 ring-rose-500' : ''
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              Scenario 02 · Industrial Hazard
            </span>
            {activeScenario === 'chemical_fire' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold animate-pulse">
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900">
                GIDC Chemical Warehouse Fire
              </h2>
              <span className="text-[11px] text-slate-400">Makarpura Industrial Zone</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            Toxic smoke and hazardous flammables. Requests foam tenders, Hazmat hazchem containment, and alerts SSG Burns ICU unit.
          </p>

          <Button
            variant="alert"
            className="w-full"
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={() => triggerScenario('chemical_fire')}
          >
            Launch Fire Scenario
          </Button>
        </Card>

        {/* Scenario 3: Highway Pileup */}
        <Card
          elevation="raised"
          className={cn(
            'p-5 space-y-4 shadow-tile',
            activeScenario === 'pileup' ? 'ring-2 ring-amber-500' : ''
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Scenario 03 · Mass Casualty
            </span>
            {activeScenario === 'pileup' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold animate-pulse">
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900">
                NH-48 Golden Chokdi Pileup
              </h2>
              <span className="text-[11px] text-slate-400">Express Highway Corridor</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            Multi-vehicle collision with trapped victims. Routes dual 108 trauma ambulances, heavy hydraulic rescue crane, and sets road diversion.
          </p>

          <Button
            variant="primary"
            className="w-full"
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={() => triggerScenario('pileup')}
          >
            Launch Pileup Scenario
          </Button>
        </Card>
      </div>

      {/* Stress Testing & Injection Toolbar (3D Tile) */}
      <Card className="p-5 space-y-4 shadow-tile">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Real-time Telemetry & Pipeline Stress Testing</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Dual Data Mode: Standalone & Live Backend Synchronized
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            onClick={() => realtimeManager.injectSensorBreach()}
          >
            Inject Sensor Threshold Breach
          </Button>

          <Button
            variant="secondary"
            icon={<Layers className="w-3.5 h-3.5 text-indigo-500" />}
            onClick={() => realtimeManager.injectDuplicateBurst()}
          >
            Inject Multi-Source Dedupe Burst (3 Reports)
          </Button>
        </div>
      </Card>

      {/* Realtime Event Stream Log (3D Tile) */}
      <Card className="p-5 space-y-3 shadow-tile">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Simulation Event Stream Log</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {logMessages.length} events captured
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-xs space-y-1.5 max-h-56 overflow-y-auto">
          {logMessages.map((msg, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-slate-400 shrink-0">{msg.ts}</span>
              <span className="text-slate-700">{msg.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
