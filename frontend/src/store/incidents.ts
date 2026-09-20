import { create } from 'zustand';
import { IncidentOut, IncidentType, PriorityLevel, IncidentStatus } from '../types/domain';
import { INITIAL_INCIDENTS } from '../services/mock';

interface IncidentsState {
  incidents: IncidentOut[];
  selectedIncidentId: string | null;
  searchQuery: string;
  filterType: string;
  filterPriority: string;
  filterStatus: string;

  setIncidents: (incidents: IncidentOut[]) => void;
  upsertIncident: (incident: IncidentOut) => void;
  selectIncident: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterType: (t: string) => void;
  setFilterPriority: (p: string) => void;
  setFilterStatus: (s: string) => void;
  
  // Direct actions
  overrideIncident: (id: string, updates: Partial<IncidentOut>) => void;
  mergeIncidents: (targetId: string, otherId: string) => void;
  approveAllAssignments: (incidentId: string) => void;
}

export const useIncidentsStore = create<IncidentsState>((set, get) => ({
  incidents: INITIAL_INCIDENTS,
  selectedIncidentId: INITIAL_INCIDENTS[0]?.id || null,
  searchQuery: '',
  filterType: 'all',
  filterPriority: 'all',
  filterStatus: 'all',

  setIncidents: (incidents) => set({ incidents }),

  upsertIncident: (incident) =>
    set((state) => {
      const idx = state.incidents.findIndex((i) => i.id === incident.id);
      if (idx >= 0) {
        const next = [...state.incidents];
        next[idx] = { ...next[idx], ...incident };
        return { incidents: next };
      }
      return { incidents: [incident, ...state.incidents] };
    }),

  selectIncident: (id) => set({ selectedIncidentId: id }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),

  overrideIncident: (id, updates) =>
    set((state) => ({
      incidents: state.incidents.map((inc) => {
        if (inc.id !== id) return inc;
        const updated = { ...inc, ...updates };
        if (updates.priority || updates.severity) {
          updated.decision_log = [
            {
              ts: new Date().toISOString(),
              action: 'MANUAL_OVERRIDE',
              reason: `Dispatcher modified: ${JSON.stringify(updates)}`,
              actor: 'Dispatcher'
            },
            ...inc.decision_log
          ];
        }
        return updated;
      })
    })),

  mergeIncidents: (targetId, otherId) =>
    set((state) => {
      const target = state.incidents.find((i) => i.id === targetId);
      const other = state.incidents.find((i) => i.id === otherId);
      if (!target || !other) return state;

      const merged: IncidentOut = {
        ...target,
        report_count: target.report_count + other.report_count,
        people_affected: Math.max(target.people_affected, other.people_affected),
        hazards: Array.from(new Set([...target.hazards, ...other.hazards])),
        sources: Array.from(new Set([...target.sources, ...other.sources])),
        decision_log: [
          {
            ts: new Date().toISOString(),
            action: 'MERGED_INCIDENT',
            reason: `Merged with ${other.code} (${other.title})`,
            actor: 'Dispatcher'
          },
          ...target.decision_log
        ]
      };

      return {
        incidents: state.incidents
          .filter((i) => i.id !== otherId)
          .map((i) => (i.id === targetId ? merged : i)),
        selectedIncidentId: targetId
      };
    }),

  approveAllAssignments: (incidentId) =>
    set((state) => ({
      incidents: state.incidents.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          status: inc.status === 'new' || inc.status === 'triaged' ? 'dispatched' : inc.status,
          first_assigned_at: inc.first_assigned_at || new Date().toISOString(),
          assignments: inc.assignments.map((a) => ({
            ...a,
            status: a.status === 'recommended' ? 'approved' : a.status
          })),
          decision_log: [
            {
              ts: new Date().toISOString(),
              action: 'DISPATCH_APPROVED',
              reason: 'All recommended units approved for immediate response',
              actor: 'Dispatcher'
            },
            ...inc.decision_log
          ]
        };
      })
    }))
}));
