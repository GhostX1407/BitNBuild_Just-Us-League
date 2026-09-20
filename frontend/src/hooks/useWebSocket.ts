import { useEffect } from 'react';
import { realtimeManager } from '../services/ws';
import { useUiStore } from '../store/ui';

export function useWebSocket() {
  const wsConnected = useUiStore((state) => state.wsConnected);
  const isMockMode = useUiStore((state) => state.isMockMode);

  useEffect(() => {
    realtimeManager.connect();
  }, [isMockMode]);

  return {
    connected: wsConnected,
    isMockMode,
    realtimeManager,
  };
}
