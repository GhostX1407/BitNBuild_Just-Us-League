import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { IncidentOut } from '../../types/domain';
import { formatTypeLabel, getStatusBadge } from '../../utils/format';
import { formatRelativeTime, computeSlaCountdown } from '../../utils/time';
import {
  Flame,
  Waves,
  Car,
  HeartPulse,
  Factory,
  Building,
  Wind,
  HelpCircle,
  Clock,
  Layers,
  MapPin,
} from 'lucide-react';
import { cn } from '../../utils/format';

interface IncidentCardProps {
  incident: IncidentOut;
  isSelected: boolean;
  onSelect: () => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  isSelected,
  onSelect,
}) => {
  const isP1 = incident.priority === 'P1';
  const slaStatus = computeSlaCountdown(incident.sla_due_at, incident.created_at);
  const statusBadge = getStatusBadge(incident.status);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'flood':
        return <Waves className="w-3.5 h-3.5 text-sky-500" />;
      case 'road_accident':
        return <Car className="w-3.5 h-3.5 text-orange-500" />;
      case 'medical':
        return <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />;
      case 'industrial_hazard':
        return <Factory className="w-3.5 h-3.5 text-amber-500" />;
      case 'building_collapse':
        return <Building className="w-3.5 h-3.5 text-orange-500" />;
      case 'gas_leak':
        return <Wind className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const priorityVariant =
    incident.priority === 'P1'
      ? 'p1'
      : incident.priority === 'P2'
      ? 'p2'
      : incident.priority === 'P3'
      ? 'p3'
      : 'p4';

  return (
    <Card
      onClick={onSelect}
      tilt={true}
      elevation={isSelected ? 'raised' : 'flat'}
      className={cn(
        'p-3.5 cursor-pointer transition-all mb-3 rounded-2xl',
        isSelected
          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-tile-hover -translate-y-0.5'
          : 'hover:border-slate-300 hover:shadow-tile'
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant} pulse={isP1}>
            {incident.priority}
          </Badge>
          <span className="font-mono text-xs font-bold text-slate-900">
            {incident.code}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
            {statusBadge.label}
          </span>
        </div>

        {/* SLA Countdown Badge */}
        <div
          className={cn(
            'flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded font-medium',
            slaStatus.isBreached
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : slaStatus.percentage < 25
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-slate-50 text-slate-500 border border-slate-200/60'
          )}
          title={`SLA: ${incident.sla_due_at}`}
        >
          <Clock className="w-3 h-3" />
          <span>{slaStatus.formatted}</span>
        </div>
      </div>

      {/* Incident Title */}
      <div className="text-xs font-semibold text-slate-900 line-clamp-1 mb-1 font-sans">
        {incident.title}
      </div>

      {/* Area & Type */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{incident.area}</span>
        </span>
        <span className="shrink-0 text-slate-300">·</span>
        <span className="shrink-0 flex items-center gap-1 text-slate-600">
          {getTypeIcon(incident.type)}
          <span>{formatTypeLabel(incident.type)}</span>
        </span>
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Layers className="w-3 h-3 text-slate-400" />
          <span>{incident.report_count} Reports</span>
        </div>
        <span>{formatRelativeTime(incident.created_at)}</span>
      </div>
    </Card>
  );
};
