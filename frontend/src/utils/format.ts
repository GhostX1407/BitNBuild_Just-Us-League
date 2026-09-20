import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PriorityLevel, IncidentType, IncidentStatus, UnitStatus, ReportSource } from '../types/domain';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPriorityColor(priority: PriorityLevel | string): string {
  switch (priority) {
    case 'P1':
      return '#FF4747'; // alert red
    case 'P2':
      return '#FF9E2C'; // signal amber
    case 'P3':
      return '#F2C230'; // caution gold
    case 'P4':
    default:
      return '#4FA6FF'; // recon blue
  }
}

export function getPriorityBgClass(priority: PriorityLevel | string): string {
  switch (priority) {
    case 'P1':
      return 'bg-alert-red/20 text-alert-red border-alert-red/40';
    case 'P2':
      return 'bg-signal-amber/20 text-signal-amber border-signal-amber/40';
    case 'P3':
      return 'bg-caution-gold/20 text-caution-gold border-caution-gold/40';
    case 'P4':
    default:
      return 'bg-recon-blue/20 text-recon-blue border-recon-blue/40';
  }
}

export function getStatusBadge(status: IncidentStatus | string): { label: string; className: string } {
  switch (status) {
    case 'new':
      return { label: 'NEW', className: 'bg-alert-red/15 text-alert-red border-alert-red/30' };
    case 'triaged':
      return { label: 'TRIAGED', className: 'bg-signal-amber/15 text-signal-amber border-signal-amber/30' };
    case 'dispatched':
      return { label: 'DISPATCHED', className: 'bg-recon-blue/15 text-recon-blue border-recon-blue/30' };
    case 'en_route':
      return { label: 'EN ROUTE', className: 'bg-caution-gold/15 text-caution-gold border-caution-gold/30' };
    case 'on_scene':
      return { label: 'ON SCENE', className: 'bg-response-teal/20 text-response-teal border-response-teal/40' };
    case 'contained':
      return { label: 'CONTAINED', className: 'bg-response-teal/15 text-response-teal border-response-teal/30' };
    case 'resolved':
      return { label: 'RESOLVED', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'closed':
      return { label: 'CLOSED', className: 'bg-slate-50 text-slate-400 border-slate-200' };
    default:
      return { label: String(status).toUpperCase(), className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function getUnitStatusBadge(status: UnitStatus | string): { label: string; className: string; dotColor: string } {
  switch (status) {
    case 'available':
      return { label: 'AVAILABLE', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: '#10B981' };
    case 'assigned':
      return { label: 'ASSIGNED', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: '#F59E0B' };
    case 'en_route':
      return { label: 'EN ROUTE', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: '#D97706' };
    case 'on_scene':
      return { label: 'ON SCENE', className: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: '#EF4444' };
    case 'returning':
      return { label: 'RETURNING', className: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: '#2563EB' };
    case 'offline':
    default:
      return { label: 'OFFLINE', className: 'bg-slate-100 text-slate-400 border-slate-200', dotColor: '#94A3B8' };
  }
}

export function formatTypeLabel(type: IncidentType | string): string {
  const map: Record<string, string> = {
    fire: 'Fire Outbreak',
    flood: 'Flash Flood / Waterlogging',
    road_accident: 'Major Road Accident',
    medical: 'Medical Emergency',
    industrial_hazard: 'Industrial Hazard',
    building_collapse: 'Structural Collapse',
    gas_leak: 'Hazardous Gas Leak',
    other: 'General Incident',
  };
  return map[type] || type.replace(/_/g, ' ');
}

export function getSourceLabel(source: ReportSource | string): string {
  const map: Record<string, string> = {
    citizen: 'Citizen Web',
    call: '112 / Call Log',
    sensor: 'IoT Sensor',
    field: 'Field Unit',
    hospital: 'Medical Facility',
    department: 'Govt Agency',
  };
  return map[source] || source;
}
