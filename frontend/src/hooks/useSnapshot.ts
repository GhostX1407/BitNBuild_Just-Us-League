import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useIncidentsStore } from '../store/incidents';
import { useUnitsStore } from '../store/units';
import { useAlertsStore } from '../store/alerts';
import { useNotificationsStore } from '../store/notifications';

export function useSnapshot() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setIncidents = useIncidentsStore((state) => state.setIncidents);
  const setUnits = useUnitsStore((state) => state.setUnits);
  const setFacilities = useUnitsStore((state) => state.setFacilities);
  const setSensors = useUnitsStore((state) => state.setSensors);
  const setAlerts = useAlertsStore((state) => state.setAlerts);
  const setNotifications = useNotificationsStore((state) => state.setNotifications);

  const loadSnapshot = async () => {
    try {
      setLoading(true);
      const data = await api.getSnapshot();
      if (data.incidents) setIncidents(data.incidents);
      if (data.units) setUnits(data.units);
      if (data.facilities) setFacilities(data.facilities);
      if (data.sensors) setSensors(data.sensors);
      if (data.alerts) setAlerts(data.alerts);
      if (data.notifications) setNotifications(data.notifications);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load system snapshot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  return { loading, error, reload: loadSnapshot };
}
