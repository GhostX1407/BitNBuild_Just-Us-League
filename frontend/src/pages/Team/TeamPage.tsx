import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Radio,
  Navigation,
  CheckCircle,
  XCircle,
  Send,
  Shield,
  MapPin,
  Clock,
  Flame,
  CheckSquare,
  Square,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useUnitsStore } from '../../store/units';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { api } from '../../services/api';
import { UnitStatus } from '../../types/domain';
import { cn } from '../../utils/format';

export const TeamPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const units = useUnitsStore((state) => state.units);
  const updateUnitStatus = useUnitsStore((state) => state.updateUnitStatus);
  const incidents = useIncidentsStore((state) => state.incidents);
  const showToast = useUiStore((state) => state.showToast);

  const activeUnit = units.find((u) => u.id === unitId) || units[0];
  const assignedIncident = incidents.find(
    (i) => i.id === activeUnit?.current_incident_id
  ) || incidents[0];

  const [fieldReportText, setFieldReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sopSteps, setSopSteps] = useState([
    { step: 'Establish primary water rescue perimeter', done: true },
    { step: 'Isolate Sector 4 transformer feeder', done: true },
    { step: 'Deploy motorized rescue boats with sonar', done: false },
    { step: 'Secure evacuation corridor for ambulance 108', done: false },
  ]);

  const toggleSop = (index: number) => {
    const next = [...sopSteps];
    next[index].done = !next[index].done;
    setSopSteps(next);
  };

  const handleStatusUpdate = (status: UnitStatus) => {
    updateUnitStatus(activeUnit.id, status);
    showToast({
      title: 'Status Updated',
      message: `${activeUnit.name} is now ${status.replace('_', ' ').toUpperCase()}`,
      type: 'info',
    });
  };

  const handleFieldReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldReportText.trim()) return;

    setIsSubmitting(true);
    try {
      await api.ingestField({
        unit_id: activeUnit.id,
        incident_id: assignedIncident?.id,
        text: fieldReportText,
        lat: activeUnit.lat,
        lng: activeUnit.lng,
        status: activeUnit.status,
      });
      showToast({
        title: 'Report Transmitted',
        message: 'Telemetry logged into dispatch incident ledger.',
        type: 'success',
      });
      setFieldReportText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 flex flex-col items-center select-none">
      <div className="w-full max-w-xl space-y-4">
        {/* Tactical Unit HUD 3D Tile */}
        <Card elevation="raised" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-sm">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {activeUnit.agency} · Fleet Unit
                </span>
                <h1 className="text-lg font-heading font-bold text-slate-900 leading-snug">
                  {activeUnit.name}
                </h1>
              </div>
            </div>

            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              {activeUnit.id}
            </span>
          </div>

          {/* Unit Stats Metrics */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Crew Size</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeUnit.crew_size} Personnel</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Fatigue Index</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>{(activeUnit.fatigue * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Current State</span>
              <span className="font-semibold text-blue-600 uppercase tracking-wide mt-0.5 block">
                {activeUnit.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Easy-to-Map Tactile Status Buttons */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Set Unit Operational Status:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleStatusUpdate('en_route')}
                className={cn(
                  'py-2.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border shadow-sm',
                  activeUnit.status === 'en_route'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 hover:bg-amber-50/50 hover:text-amber-800 border-slate-200'
                )}
              >
                <Navigation className="w-4 h-4" />
                <span>En Route</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusUpdate('on_scene')}
                className={cn(
                  'py-2.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border shadow-sm',
                  activeUnit.status === 'on_scene'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300 animate-pulse'
                    : 'bg-white text-slate-700 hover:bg-rose-50/50 hover:text-rose-800 border-slate-200'
                )}
              >
                <Flame className="w-4 h-4" />
                <span>On Scene</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusUpdate('available')}
                className={cn(
                  'py-2.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border shadow-sm',
                  activeUnit.status === 'available'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                    : 'bg-white text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-800 border-slate-200'
                )}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Available</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Assigned Mission Target 3D Tile */}
        {assignedIncident && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Incident Target
              </span>
              <Badge variant={assignedIncident.priority === 'P1' ? 'p1' : 'p2'}>
                {assignedIncident.priority} Priority
              </Badge>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">
                {assignedIncident.code}: {assignedIncident.title}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{assignedIncident.area}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              {assignedIncident.summary}
            </p>

            {/* Tactical SOP Checklist */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 space-y-2.5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 block">
                Standard Field Protocol Checklist:
              </span>
              <div className="space-y-2">
                {sopSteps.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSop(idx)}
                    className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none hover:text-slate-950 transition-colors"
                  >
                    {s.done ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={s.done ? 'line-through text-slate-400 font-normal' : 'font-medium'}>
                      {s.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Transmit Field Observations 3D Tile */}
        <Card className="p-5 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Send className="w-4 h-4 text-blue-600" />
            <span>Transmit Field Intelligence to Dispatch</span>
          </div>

          <form onSubmit={handleFieldReportSubmit} className="space-y-3">
            <textarea
              rows={3}
              required
              placeholder="Report ground observations, hazard expansion, flood depth, or casualties..."
              value={fieldReportText}
              onChange={(e) => setFieldReportText(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting || !fieldReportText.trim()}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Transmitting...' : 'Send Field Update'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
