import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Flame, Radio, Building2, Shield, Filter } from 'lucide-react';
import { IncidentCard } from './IncidentCard';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/format';

export const IncidentQueue: React.FC = () => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const selectedIncidentId = useIncidentsStore((state) => state.selectedIncidentId);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);

  const searchQuery = useIncidentsStore((state) => state.searchQuery);
  const setSearchQuery = useIncidentsStore((state) => state.setSearchQuery);

  const filterPriority = useIncidentsStore((state) => state.filterPriority);
  const setFilterPriority = useIncidentsStore((state) => state.setFilterPriority);

  const currentUser = useUiStore((state) => state.currentUser);
  const [roleScope, setRoleScope] = useState<'all' | 'scoped'>('all');

  const sortedAndFiltered = useMemo(() => {
    const priorityWeight: Record<string, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };

    return incidents
      .filter((inc) => {
        if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;

        // Role-based scope filtering
        if (roleScope === 'scoped') {
          if (currentUser.role === 'team') {
            const isAssignedSector =
              inc.area.toLowerCase().includes('manjalpur') ||
              inc.title.toLowerCase().includes('flood') ||
              inc.title.toLowerCase().includes('water');
            const hasUnit = inc.assignments.some(
              (a) => a.unit_id === 'unit-boat-01' || a.kind === 'boat'
            );
            if (!isAssignedSector && !hasUnit) return false;
          } else if (currentUser.role === 'hospital') {
            const isMedical =
              inc.type === 'medical' ||
              inc.type === 'road_accident' ||
              inc.type === 'building_collapse' ||
              inc.severity >= 4;
            if (!isMedical) return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCode = inc.code.toLowerCase().includes(q);
          const matchTitle = inc.title.toLowerCase().includes(q);
          const matchArea = inc.area.toLowerCase().includes(q);
          return matchCode || matchTitle || matchArea;
        }
        return true;
      })
      .sort((a, b) => {
        const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [incidents, searchQuery, filterPriority, roleScope, currentUser.role]);

  const priorityOptions = [
    { key: 'all', label: 'All', activeClass: 'bg-slate-900 text-white' },
    { key: 'P1', label: 'P1', activeClass: 'bg-rose-600 text-white shadow-xs' },
    { key: 'P2', label: 'P2', activeClass: 'bg-amber-500 text-white shadow-xs' },
    { key: 'P3', label: 'P3', activeClass: 'bg-sky-500 text-white shadow-xs' },
    { key: 'P4', label: 'P4', activeClass: 'bg-slate-700 text-white shadow-xs' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/70 select-none">
      {/* Search and Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <div className="w-5 h-5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="font-heading font-bold">Incident Queue</span>
            <span className="text-slate-500 font-medium font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100">
              {sortedAndFiltered.length}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Triage
          </span>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search code, ward, incident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
          />
        </div>

        {/* Role Differentiated Scope Toggle */}
        {currentUser.role !== 'dispatcher' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setRoleScope('all')}
              className={cn(
                'flex-1 py-1 rounded-lg text-center font-medium transition-all cursor-pointer text-xs',
                roleScope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              All Incidents
            </button>
            <button
              onClick={() => setRoleScope('scoped')}
              className={cn(
                'flex-1 py-1 rounded-lg text-center font-medium transition-all flex items-center justify-center gap-1 cursor-pointer text-xs',
                roleScope === 'scoped'
                  ? currentUser.role === 'team'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-rose-600 text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {currentUser.role === 'team' ? (
                <>
                  <Radio className="w-3 h-3" />
                  <span>My Sector</span>
                </>
              ) : (
                <>
                  <Building2 className="w-3 h-3" />
                  <span>Medical</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Priority Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          {priorityOptions.map((opt) => {
            const isActive = filterPriority === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilterPriority(opt.key)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer font-mono',
                  isActive
                    ? `${opt.activeClass} font-bold scale-[1.03]`
                    : 'bg-slate-100/90 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incident List with Staggered Entrance */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar space-y-0.5">
        <AnimatePresence mode="popLayout">
          {sortedAndFiltered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 text-slate-400 text-xs font-medium"
            >
              No incidents match current filter criteria.
            </motion.div>
          ) : (
            sortedAndFiltered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                isSelected={incident.id === selectedIncidentId}
                onSelect={() => selectIncident(incident.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
