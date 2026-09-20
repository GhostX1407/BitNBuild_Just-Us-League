import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  Bed,
  Plus,
  Minus,
  AlertOctagon,
  HeartPulse,
  Activity,
  Phone,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { useUnitsStore } from '../../store/units';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { api } from '../../services/api';
import { cn } from '../../utils/format';

export const HospitalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const activeId = id || 'fac-ssg';

  const facilities = useUnitsStore((state) => state.facilities);
  const updateFacilityBeds = useUnitsStore((state) => state.updateFacilityBeds);
  const toggleDiversion = useUnitsStore((state) => state.toggleDiversion);
  const incidents = useIncidentsStore((state) => state.incidents);
  const showToast = useUiStore((state) => state.showToast);

  const facility = facilities.find((f) => f.id === activeId) || facilities[0];

  // Incidents with medical/trauma requirements
  const incomingEmergencies = incidents.filter(
    (i) =>
      i.type === 'medical' ||
      i.type === 'road_accident' ||
      i.type === 'building_collapse' ||
      i.severity >= 4
  );

  const handleBedChange = (delta: number) => {
    const nextBeds = Math.max(0, Math.min(facility.beds_total, facility.beds_free + delta));
    updateFacilityBeds(facility.id, nextBeds);
    api.updateFacility(facility.id, { beds_free: nextBeds });
  };

  const handleDiversionToggle = () => {
    toggleDiversion(facility.id);
    api.updateFacility(facility.id, { on_diversion: !facility.on_diversion });
    showToast({
      title: facility.on_diversion ? 'Diversion Lifted' : 'Diversion Active',
      message: `${facility.name} status updated. Emergency dispatch informed.`,
      type: facility.on_diversion ? 'info' : 'warn',
    });
  };

  const occupancyRate = (
    ((facility.beds_total - facility.beds_free) / Math.max(1, facility.beds_total)) *
    100
  ).toFixed(0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 flex flex-col items-center select-none">
      <div className="w-full max-w-xl space-y-5">
        {/* Hospital Header HUD 3D Tile */}
        <Card elevation="raised" className="p-6 space-y-4 shadow-tile">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-slate-900">
                  {facility.name}
                </h1>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Emergency Desk: {facility.contact}</span>
                </div>
              </div>
            </div>

            {facility.on_diversion ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-pulse">
                ON DIVERSION
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                ACCEPTING PATIENTS
              </span>
            )}
          </div>

          {/* Capabilities Badges */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/80">
            {facility.capabilities.map((cap) => (
              <span
                key={cap}
                className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 uppercase font-semibold border border-slate-200"
              >
                {cap}
              </span>
            ))}
          </div>
        </Card>

        {/* Real-time Bed Capacity Stepper 3D Tile */}
        <Card className="p-6 space-y-5 shadow-tile">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Bed className="w-4 h-4 text-blue-600" />
              <span>Available Emergency Bed Capacity</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Occupancy: <strong className="text-slate-900">{occupancyRate}%</strong>
            </span>
          </div>

          {/* Large Tactile Bed Counter */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <button
              type="button"
              onClick={() => handleBedChange(-1)}
              disabled={facility.beds_free <= 0}
              className="w-12 h-12 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:translate-y-0.5 shadow-sm flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
              title="Decrease free beds"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-slate-900">
                {facility.beds_free}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Free out of {facility.beds_total} Total Beds
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleBedChange(1)}
              disabled={facility.beds_free >= facility.beds_total}
              className="w-12 h-12 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:translate-y-0.5 shadow-sm flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
              title="Increase free beds"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Clean Progress Meter */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  Number(occupancyRate) > 85
                    ? 'bg-rose-500'
                    : Number(occupancyRate) > 65
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                )}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>{facility.beds_total - facility.beds_free} Beds Occupied</span>
              <span>Capacity Limit: {facility.beds_total}</span>
            </div>
          </div>

          {/* Diversion Switch Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-800">
                Emergency Ambulance Diversion
              </div>
              <div className="text-[11px] text-slate-500">
                Route incoming ambulances to secondary hospitals when at maximum capacity
              </div>
            </div>

            <Toggle
              checked={facility.on_diversion}
              onChange={handleDiversionToggle}
            />
          </div>
        </Card>

        {/* Incoming En Route Emergencies 3D Tile */}
        <Card className="p-5 space-y-3 shadow-tile">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <span>Incoming Trauma & Evacuation Cases ({incomingEmergencies.length})</span>
          </div>

          <div className="space-y-2">
            {incomingEmergencies.map((inc) => (
              <div
                key={inc.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {inc.code}: {inc.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {inc.area} · Severity {inc.severity}/5
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">
                  {inc.priority}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
