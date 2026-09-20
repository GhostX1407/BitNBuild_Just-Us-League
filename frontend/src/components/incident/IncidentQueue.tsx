import React, { useMemo } from 'react';
import { Search, Flame } from 'lucide-react';
import { IncidentCard } from './IncidentCard';
import { useIncidentsStore } from '../../store/incidents';
import { cn } from '../../utils/format';

export const IncidentQueue: React.FC = () => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const selectedIncidentId = useIncidentsStore((state) => state.selectedIncidentId);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);

  const searchQuery = useIncidentsStore((state) => state.searchQuery);
  const setSearchQuery = useIncidentsStore((state) => state.setSearchQuery);

  const filterPriority = useIncidentsStore((state) => state.filterPriority);
  const setFilterPriority = useIncidentsStore((state) => state.setFilterPriority);

  const sortedAndFiltered = useMemo(() => {
    const priorityWeight: Record<string, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };

    return incidents
      .filter((inc) => {
        if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;

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
  }, [incidents, searchQuery, filterPriority]);

  const priorityOptions = ['all', 'P1', 'P2', 'P3', 'P4'];

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">
      {/* Search and Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Incident Queue</span>
            <span className="text-slate-400 font-normal font-mono">({sortedAndFiltered.length})</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Live Triage</span>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search code, area, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          {priorityOptions.map((opt) => {
            const isActive = filterPriority === opt;
            return (
              <button
                key={opt}
                onClick={() => setFilterPriority(opt)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                )}
              >
                {opt === 'all' ? 'All' : opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {sortedAndFiltered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No incidents found matching criteria.
          </div>
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
      </div>
    </div>
  );
};
