import { create } from 'zustand';
import { UnitOut, FacilityOut, SensorOut, UnitStatus } from '../types/domain';
import { INITIAL_UNITS, INITIAL_FACILITIES, INITIAL_SENSORS } from '../services/mock';

interface UnitsState {
  units: UnitOut[];
  facilities: FacilityOut[];
  sensors: SensorOut[];

  setUnits: (units: UnitOut[]) => void;
  updateUnit: (unit: UnitOut) => void;
  updateUnitStatus: (id: string, status: UnitStatus) => void;

  setFacilities: (facilities: FacilityOut[]) => void;
  updateFacilityBeds: (id: string, bedsFree: number) => void;
  toggleDiversion: (id: string) => void;

  setSensors: (sensors: SensorOut[]) => void;
  updateSensor: (sensor: SensorOut) => void;
}

export const useUnitsStore = create<UnitsState>((set) => ({
  units: INITIAL_UNITS,
  facilities: INITIAL_FACILITIES,
  sensors: INITIAL_SENSORS,

  setUnits: (units) => set({ units }),

  updateUnit: (unit) =>
    set((state) => {
      const idx = state.units.findIndex((u) => u.id === unit.id);
      if (idx >= 0) {
        const next = [...state.units];
        next[idx] = { ...next[idx], ...unit };
        return { units: next };
      }
      return { units: [...state.units, unit] };
    }),

  updateUnitStatus: (id, status) =>
    set((state) => ({
      units: state.units.map((u) => (u.id === id ? { ...u, status } : u))
    })),

  setFacilities: (facilities) => set({ facilities }),

  updateFacilityBeds: (id, bedsFree) =>
    set((state) => ({
      facilities: state.facilities.map((f) => (f.id === id ? { ...f, beds_free: bedsFree } : f))
    })),

  toggleDiversion: (id) =>
    set((state) => ({
      facilities: state.facilities.map((f) => (f.id === id ? { ...f, on_diversion: !f.on_diversion } : f))
    })),

  setSensors: (sensors) => set({ sensors }),

  updateSensor: (sensor) =>
    set((state) => ({
      sensors: state.sensors.map((s) => (s.id === sensor.id ? { ...s, ...sensor } : s))
    }))
}));
