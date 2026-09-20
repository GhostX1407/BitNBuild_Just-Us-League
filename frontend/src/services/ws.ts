// ResQGrid WebSocket and In-Memory Realtime Event Emitter
import { useIncidentsStore } from '../store/incidents';
import { useUnitsStore } from '../store/units';
import { useAlertsStore } from '../store/alerts';
import { useNotificationsStore } from '../store/notifications';
import { useUiStore } from '../store/ui';
import { UnitOut, AlertOut, IncidentOut, SensorOut } from '../types/domain';
import { INITIAL_INCIDENTS, INITIAL_UNITS, INITIAL_SENSORS, INITIAL_ALERTS } from './mock';

type EventHandler = (data: any) => void;

class RealtimeManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private mockTicker: any = null;
  private unitMoverTicker: any = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  constructor() {
    // Automatically start unit movement loop for alive demo feel
    this.startUnitMovementSim();
  }

  public connect(url?: string) {
    const isMock = useUiStore.getState().isMockMode;
    if (isMock) {
      this.startMockEventLoop();
      useUiStore.getState().setWsConnected(true);
      return;
    }

    try {
      const defaultUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`;
      this.socket = new WebSocket(url || defaultUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        useUiStore.getState().setWsConnected(true);
        console.log('[WS] Connected to live backend stream');
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleEvent(message.type, message.payload);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.socket.onclose = () => {
        useUiStore.getState().setWsConnected(false);
        this.attemptReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[WS] Socket error, falling back to mock event stream:', err);
        this.socket?.close();
        this.startMockEventLoop();
      };
    } catch (e) {
      this.startMockEventLoop();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts));
      this.reconnectTimer = setTimeout(() => {
        console.log(`[WS] Reconnecting attempt ${this.reconnectAttempts}...`);
        this.connect();
      }, delay);
    } else {
      console.log('[WS] Max reconnect attempts reached, running in standalone mock mode');
      this.startMockEventLoop();
    }
  }

  public on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);
  }

  public off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  public handleEvent(type: string, payload: any) {
    // Notify registered listeners
    this.handlers.get(type)?.forEach((h) => h(payload));

    // Dispatch to Zustand stores
    switch (type) {
      case 'incident.upsert':
        useIncidentsStore.getState().upsertIncident(payload);
        break;
      case 'unit.update':
        useUnitsStore.getState().updateUnit(payload);
        break;
      case 'sensor.update':
        useUnitsStore.getState().updateSensor(payload);
        break;
      case 'alert.new':
        useAlertsStore.getState().addAlert(payload);
        useUiStore.getState().showToast({
          title: `ALERT [${payload.kind?.toUpperCase()} L${payload.level}]`,
          message: payload.message,
          type: payload.level >= 2 ? 'alert' : 'warn'
        });
        break;
      case 'alert.ack':
        useAlertsStore.getState().ackAlert(payload.id);
        break;
      case 'alert.resolved':
        useAlertsStore.getState().resolveAlert(payload.id);
        break;
      case 'notification.new':
        useNotificationsStore.getState().addNotification(payload);
        break;
      default:
        break;
    }
  }

  // Unit movement simulation along Vadodara roads
  private startUnitMovementSim() {
    if (this.unitMoverTicker) return;
    let step = 0;

    this.unitMoverTicker = setInterval(() => {
      step += 0.04;
      const units = useUnitsStore.getState().units;
      const enRouteUnits = units.filter((u) => u.status === 'en_route');

      enRouteUnits.forEach((unit, idx) => {
        // Small oscillation towards destination to simulate vehicle motion
        const deltaLat = Math.sin(step + idx) * 0.00035;
        const deltaLng = Math.cos(step + idx) * 0.00035;

        const updated: UnitOut = {
          ...unit,
          lat: Number((unit.lat + deltaLat).toFixed(6)),
          lng: Number((unit.lng + deltaLng).toFixed(6)),
        };

        useUnitsStore.getState().updateUnit(updated);
      });
    }, 1800);
  }

  // Standalone mock stream when backend is not connected
  public startMockEventLoop() {
    if (this.mockTicker) return;

    this.mockTicker = setInterval(() => {
      // Periodic sensor fluctuations
      const sensors = useUnitsStore.getState().sensors;
      if (sensors.length > 0) {
        const randSensor = sensors[Math.floor(Math.random() * sensors.length)];
        const delta = (Math.random() - 0.48) * 0.2;
        const newValue = Number(Math.max(0, randSensor.last_value + delta).toFixed(1));

        const updatedSensor: SensorOut = {
          ...randSensor,
          last_value: newValue,
          state: newValue >= randSensor.threshold ? 'breach' : newValue >= randSensor.threshold * 0.85 ? 'warn' : 'ok',
          last_at: new Date().toISOString(),
        };

        useUnitsStore.getState().updateSensor(updatedSensor);
      }
    }, 6000);
  }

  // Scripted Demo Scenarios
  public playScenario(scenarioName: 'flood' | 'chemical_fire' | 'pileup') {
    useUiStore.getState().setActiveScenario(scenarioName);
    useUiStore.getState().setSimRunning(true);

    if (scenarioName === 'flood') {
      useUiStore.getState().showToast({
        title: 'SCENARIO TRIGGERED: VISHWAMITRI FLOOD',
        message: 'River gauge #1 breached 26.8ft. Automated multi-source clustering initiated.',
        type: 'alert'
      });

      // 1. Sensor breach
      setTimeout(() => {
        const sensor = useUnitsStore.getState().sensors.find((s) => s.id === 'sensor-vg-01');
        if (sensor) {
          useUnitsStore.getState().updateSensor({ ...sensor, last_value: 27.2, state: 'breach' });
        }
      }, 1000);

      // 2. New high-priority alert
      setTimeout(() => {
        const newAlert: AlertOut = {
          id: `alt-sim-${Date.now()}`,
          incident_id: 'inc-001',
          kind: 'critical',
          rule: 'R1_CRITICAL_SURGE',
          level: 3,
          message: 'CRITICAL L3: Rapid water ingress reported at Sayaji Baug Zoo. Immediate boat evacuation mandatory.',
          status: 'open',
          created_at: new Date().toISOString()
        };
        useAlertsStore.getState().addAlert(newAlert);
      }, 2500);

      // 3. Update Incident with fresh report
      setTimeout(() => {
        const inc = useIncidentsStore.getState().incidents.find((i) => i.id === 'inc-001');
        if (inc) {
          useIncidentsStore.getState().upsertIncident({
            ...inc,
            report_count: inc.report_count + 3,
            people_affected: 48,
            status: 'dispatched'
          });
        }
      }, 4000);

    } else if (scenarioName === 'chemical_fire') {
      useUiStore.getState().showToast({
        title: 'SCENARIO TRIGGERED: GIDC CHEMICAL FIRE',
        message: 'VOC sensor spike detected (540ppm). Hazmat containment protocol activated.',
        type: 'alert'
      });

      setTimeout(() => {
        const newAlert: AlertOut = {
          id: `alt-chem-${Date.now()}`,
          incident_id: 'inc-002',
          kind: 'escalation',
          rule: 'R5_TOXIC_PLUME_EXPANSION',
          level: 2,
          message: 'AIR DISPERSION ALERT: Benzene plume expanding 600m south-west towards Tarsali residential area.',
          status: 'open',
          created_at: new Date().toISOString()
        };
        useAlertsStore.getState().addAlert(newAlert);
      }, 2000);
    } else if (scenarioName === 'pileup') {
      useUiStore.getState().showToast({
        title: 'SCENARIO TRIGGERED: NH48 PILEUP',
        message: 'Multiple vehicle collision reported at Golden Crossroads. Emergency corridor requested.',
        type: 'warn'
      });
    }
  }

  public injectSensorBreach() {
    const sensor = useUnitsStore.getState().sensors[0];
    if (sensor) {
      useUnitsStore.getState().updateSensor({
        ...sensor,
        last_value: Number((sensor.threshold * 1.3).toFixed(1)),
        state: 'breach',
        last_at: new Date().toISOString()
      });
      useUiStore.getState().showToast({
        title: 'SENSOR THRESHOLD BREACH',
        message: `${sensor.kind.toUpperCase()} sensor ${sensor.id} exceeded limit: ${(sensor.threshold * 1.3).toFixed(1)} ${sensor.unit}`,
        type: 'alert'
      });
    }
  }

  public injectDuplicateBurst() {
    const inc = useIncidentsStore.getState().incidents[0];
    if (inc) {
      useIncidentsStore.getState().upsertIncident({
        ...inc,
        report_count: inc.report_count + 4,
        confidence: Math.min(0.99, inc.confidence + 0.03)
      });
      useUiStore.getState().showToast({
        title: 'DUPLICATE CORROBORATION BURST',
        message: `4 incoming reports automatically consolidated into ${inc.code}. Deduplication ratio increased.`,
        type: 'info'
      });
    }
  }

  public fastForwardSla() {
    const inc = useIncidentsStore.getState().incidents[0];
    if (inc) {
      useIncidentsStore.getState().upsertIncident({
        ...inc,
        sla_due_at: new Date(Date.now() - 30000).toISOString() // make it breached
      });
      useUiStore.getState().showToast({
        title: 'SLA BREACH SIMULATED',
        message: `Incident ${inc.code} SLA timer expired. Escalation ladder triggered.`,
        type: 'alert'
      });
    }
  }

  public resetSimulation() {
    useIncidentsStore.getState().setIncidents(INITIAL_INCIDENTS);
    useUnitsStore.getState().setUnits(INITIAL_UNITS);
    useUnitsStore.getState().setSensors(INITIAL_SENSORS);
    useAlertsStore.getState().setAlerts(INITIAL_ALERTS);
    useUiStore.getState().setActiveScenario(null);
    useUiStore.getState().setSimRunning(false);
    useUiStore.getState().showToast({
      title: 'SIMULATION RESET',
      message: 'Operational environment restored to baseline state.',
      type: 'info'
    });
  }
}

export const realtimeManager = new RealtimeManager();
