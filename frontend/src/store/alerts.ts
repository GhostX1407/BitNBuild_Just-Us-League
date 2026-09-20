import { create } from 'zustand';
import { AlertOut } from '../types/domain';
import { INITIAL_ALERTS } from '../services/mock';

interface AlertsState {
  alerts: AlertOut[];
  setAlerts: (alerts: AlertOut[]) => void;
  addAlert: (alert: AlertOut) => void;
  ackAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  escalateAlert: (id: string) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: INITIAL_ALERTS,

  setAlerts: (alerts) => set({ alerts }),

  addAlert: (alert) =>
    set((state) => {
      const exists = state.alerts.some((a) => a.id === alert.id);
      if (exists) {
        return { alerts: state.alerts.map((a) => (a.id === alert.id ? { ...a, ...alert } : a)) };
      }
      return { alerts: [alert, ...state.alerts] };
    }),

  ackAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, status: 'ack', ack_at: new Date().toISOString() } : a
      )
    })),

  resolveAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a))
    })),

  escalateAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, level: Math.min(3, a.level + 1) } : a
      )
    }))
}));
