import React from 'react';
import { motion } from 'framer-motion';
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
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/format';

interface IncidentCardProps {
  incident: IncidentOut;
  isSelected: boolean;
  onSelect: () => void;
}

// Executive Color Scheme matching Analytics Page
const TYPE_ACCENTS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  flood: {
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    glow: '#0284C7',
  },
  fire: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    glow: '#E11D48',
  },
  road_accident: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    glow: '#F59E0B',
  },
  medical: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    glow: '#10B981',
  },
  industrial_hazard: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    glow: '#8B5CF6',
  },
  building_collapse: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    glow: '#D97706',
  },
  gas_leak: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    glow: '#EC4899',
  },
  other: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    glow: '#64748B',
  },
};

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  isSelected,
  onSelect,
}) => {
  const isP1 = incident.priority === 'P1';
  const slaStatus = computeSlaCountdown(incident.sla_due_at, incident.created_at);
  const statusBadge = getStatusBadge(incident.status);
  const accent = TYPE_ACCENTS[incident.type] || TYPE_ACCENTS.other;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'flood':
        return <Waves className="w-3.5 h-3.5 text-sky-500" />;
      case 'road_accident':
        return <Car className="w-3.5 h-3.5 text-amber-500" />;
      case 'medical':
        return <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />;
      case 'industrial_hazard':
        return <Factory className="w-3.5 h-3.5 text-violet-500" />;
      case 'building_collapse':
        return <Building className="w-3.5 h-3.5 text-amber-700" />;
      case 'gas_leak':
        return <Wind className="w-3.5 h-3.5 text-pink-500" />;
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        onClick={onSelect}
        className={cn(
          'p-3.5 cursor-pointer transition-all duration-200 mb-2.5 rounded-2xl relative overflow-hidden text-left group',
          'bg-white border shadow-tile',
          isSelected
            ? 'border-slate-900 ring-2 ring-indigo-500/20 shadow-tile-hover -translate-y-0.5 bg-slate-50/50'
            : 'border-slate-200/90 hover:border-slate-300 hover:shadow-tile-hover hover:-translate-y-0.5'
        )}
      >
        {/* Type Accent Strip on the Left Edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200"
          style={{
            backgroundColor: isSelected ? '#0F172A' : accent.glow,
            opacity: isSelected ? 1 : 0.85,
          }}
        />

        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 mb-2 pl-1.5">
          <div className="flex items-center gap-1.5">
            <Badge variant={priorityVariant} pulse={isP1}>
              {incident.priority}
            </Badge>
            <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {incident.code}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium">
              {statusBadge.label}
            </span>
          </div>

          {/* SLA Countdown Badge */}
          <div
            className={cn(
              'flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold shadow-2xs',
              slaStatus.isBreached
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : slaStatus.percentage < 25
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200/60'
            )}
            title={`SLA: ${incident.sla_due_at}`}
          >
            <Clock className="w-3 h-3" />
            <span>{slaStatus.formatted}</span>
          </div>
        </div>

        {/* Incident Title */}
        <div className="text-xs font-semibold text-slate-900 line-clamp-1 mb-1 font-sans pl-1.5">
          {incident.title}
        </div>

        {/* Area & Type with Categorical Color Pill */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5 pl-1.5">
          <span className="flex items-center gap-1 truncate text-slate-600">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{incident.area}</span>
          </span>
          <span className="shrink-0 text-slate-300">·</span>
          <span
            className={cn(
              'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border',
              accent.bg,
              accent.text,
              accent.border
            )}
          >
            {getTypeIcon(incident.type)}
            <span>{formatTypeLabel(incident.type)}</span>
          </span>
        </div>

        {/* Footer Details: Deduplication & Timestamp */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 pl-1.5">
          <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>{incident.report_count} Consolidated</span>
          </div>
          <span className="text-slate-400">{formatRelativeTime(incident.created_at)}</span>
        </div>
      </div>
    </motion.div>
  );
};
