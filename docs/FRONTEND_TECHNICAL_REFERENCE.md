# ResQGrid — Frontend Technical Reference

> **Complete Frontend Architecture, Component Design, and State Management Documentation**

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Directory Structure](#2-directory-structure)
3. [Design System & Tokens](#3-design-system--tokens)
4. [State Management Architecture](#4-state-management-architecture)
5. [API & WebSocket Layer](#5-api--websocket-layer)
6. [Page: Console (Dispatcher Dashboard)](#6-page-console-dispatcher-dashboard)
7. [Page: Analytics](#7-page-analytics)
8. [Page: Report (Citizen Intake)](#8-page-report-citizen-intake)
9. [Page: Team (Field Interface)](#9-page-team-field-interface)
10. [Page: Track (Public Tracking)](#10-page-track-public-tracking)
11. [Page: Hospital (Capacity Management)](#11-page-hospital-capacity-management)
12. [Page: Simulator](#12-page-simulator)
13. [Map System](#13-map-system)
14. [Component Library](#14-component-library)
15. [Routing & Navigation](#15-routing--navigation)
16. [Mock Mode Architecture](#16-mock-mode-architecture)

---

## 1. Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI component framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| Zustand | 4.x | State management |
| React Router | 6.x | Client-side routing |
| React-Leaflet | 4.x | Map rendering |
| Leaflet | 1.9.x | Map engine |
| Recharts | 2.x | Charts and data visualization |
| Tailwind CSS | 3.x | Utility-first styling |
| Lucide React | Latest | Icon library |
| date-fns | Latest | Date formatting |

---

## 2. Directory Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                    # React app entry point
    ├── App.tsx                     # Root component with router
    ├── types/
    │   └── domain.ts               # TypeScript domain types (canonical contract)
    ├── services/
    │   ├── api.ts                  # Typed REST API client
    │   ├── ws.ts                   # WebSocket client with auto-reconnect
    │   └── mock.ts                 # In-memory mock data for offline mode
    ├── store/
    │   ├── incidents.ts            # Incident Zustand store
    │   ├── units.ts                # Unit Zustand store
    │   ├── alerts.ts               # Alert Zustand store
    │   ├── notifications.ts        # Notification Zustand store
    │   └── ui.ts                   # UI state store (modal, selected, etc.)
    ├── hooks/
    │   ├── useWebSocket.ts         # WebSocket lifecycle hook
    │   └── useSnapshot.ts          # Snapshot fetch and apply hook
    ├── utils/
    │   ├── format.ts               # Formatting (priority colors, type labels, etc.)
    │   ├── geo.ts                  # Haversine distance, coordinate helpers
    │   └── time.ts                 # Time formatting, relative time, SLA countdown
    ├── styles/
    │   └── tokens.css              # CSS custom properties (design tokens)
    ├── components/
    │   ├── ui/                     # Primitive UI components
    │   │   ├── Card.tsx
    │   │   ├── Button.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Toggle.tsx
    │   │   ├── Modal.tsx
    │   │   └── Toast.tsx
    │   ├── map/                    # Map-specific components
    │   │   ├── ResQMap.tsx         # Main map wrapper
    │   │   ├── IncidentMarker.tsx  # Animated pulsing incident markers
    │   │   ├── UnitMarker.tsx      # Unit position markers with status
    │   │   ├── SensorMarker.tsx    # Sensor markers with breach overlay
    │   │   └── IncidentHeatmap.tsx # Historic data heatmap layer
    │   └── shared/                 # Shared non-primitive components
    │       ├── KPIStrip.tsx        # Top KPI bar
    │       ├── IncidentList.tsx    # Sorted incident queue
    │       ├── IncidentDrawer.tsx  # Full incident detail panel
    │       ├── AlertsPanel.tsx     # Alert notification sidebar
    │       └── NotificationBell.tsx # Notification badge + popover
    └── pages/
        ├── Console/                # Dispatcher command center
        ├── Analytics/              # Charts and metrics
        ├── Report/                 # Citizen report form
        ├── Team/                   # Field team interface
        ├── Track/                  # Public incident tracking
        ├── Hospital/               # Hospital capacity management
        └── Simulator/              # Demo control panel
```

---

## 3. Design System & Tokens

### CSS Custom Properties (`src/styles/tokens.css`)

```css
:root {
  /* ── Color Palette ─────────────────────────────────── */
  --color-bg-primary: #0f1117;        /* Main background */
  --color-bg-secondary: #1a1d27;      /* Card/panel background */
  --color-bg-tertiary: #252836;       /* Input/hover backgrounds */
  --color-border: rgba(255,255,255,0.08);
  
  --color-text-primary: #e8eaf6;
  --color-text-secondary: #9e9eb3;
  --color-text-muted: #6b6b85;
  
  /* ── Priority Colors ───────────────────────────────── */
  --color-p1: #ef4444;      /* P1 Red — critical */
  --color-p2: #f97316;      /* P2 Orange — high */
  --color-p3: #eab308;      /* P3 Yellow — medium */
  --color-p4: #22c55e;      /* P4 Green — low */
  
  /* ── Status Colors ─────────────────────────────────── */
  --color-status-new: #9b59b6;
  --color-status-triaged: #3498db;
  --color-status-dispatched: #f39c12;
  --color-status-en-route: #e67e22;
  --color-status-on-scene: #27ae60;
  --color-status-resolved: #95a5a6;
  
  /* ── Map Colors ─────────────────────────────────────── */
  --color-map-fire: #ff4444;
  --color-map-flood: #4488ff;
  --color-map-medical: #ff44aa;
  --color-map-accident: #ff8800;
  --color-map-industrial: #ffaa00;
  --color-map-available: #44ff88;
  --color-map-en-route: #ffcc44;
  --color-map-on-scene: #ff4444;
  
  /* ── Spacing ────────────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* ── Typography ─────────────────────────────────────── */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', 'Cascadia Code', monospace;
  
  /* ── Motion ─────────────────────────────────────────── */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{tsx,ts,jsx,js}'],
  theme: {
    extend: {
      colors: {
        'resq-bg': '#0f1117',
        'resq-panel': '#1a1d27',
        'p1': '#ef4444',
        'p2': '#f97316',
        'p3': '#eab308',
        'p4': '#22c55e',
      }
    }
  }
}
```

---

## 4. State Management Architecture

ResQGrid uses **Zustand** for global state. Each store manages a domain slice and is updated idempotently from WebSocket events.

### Incident Store (`store/incidents.ts`)

```typescript
interface IncidentStore {
  incidents: IncidentOut[];
  selectedId: string | null;
  filter: IncidentFilter;
  
  upsertIncident: (incident: IncidentOut) => void;
  replaceAll: (incidents: IncidentOut[]) => void;
  setSelected: (id: string | null) => void;
  setFilter: (filter: Partial<IncidentFilter>) => void;
  
  // Computed selectors
  getFiltered: () => IncidentOut[];
  getActive: () => IncidentOut[];
  getSortedByPriority: () => IncidentOut[];
}

const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  selectedId: null,
  filter: { status: null, type: null, priority: null },
  
  upsertIncident: (incident) => set(state => {
    const idx = state.incidents.findIndex(i => i.id === incident.id);
    if (idx >= 0) {
      const next = [...state.incidents];
      next[idx] = incident;
      return { incidents: next };
    }
    return { incidents: [...state.incidents, incident] };
  }),
  
  replaceAll: (incidents) => set({ incidents }),
  setSelected: (id) => set({ selectedId: id }),
  // ...
}));
```

**Idempotent upsert**: `upsertIncident` either replaces an existing entry (by `id`) or appends a new one. Safe to call multiple times with the same data.

### Unit Store (`store/units.ts`)

```typescript
const useUnitStore = create<UnitStore>((set) => ({
  units: [],
  upsertUnit: (unit) => set(state => ({
    units: state.units.some(u => u.id === unit.id)
      ? state.units.map(u => u.id === unit.id ? unit : u)
      : [...state.units, unit]
  })),
  replaceAll: (units) => set({ units }),
}));
```

### UI Store (`store/ui.ts`)

```typescript
interface UIStore {
  sidebarOpen: boolean;
  alertsPanelOpen: boolean;
  drawerIncidentId: string | null;
  toast: ToastMessage | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  showToast: (msg: ToastMessage) => void;
  setWsStatus: (status: UIStore['wsStatus']) => void;
}
```

---

## 5. API & WebSocket Layer

### API Client (`services/api.ts`)

All requests go through typed wrappers. Example:

```typescript
export const apiService = {
  getSnapshot: (): Promise<Snapshot> =>
    get('/api/snapshot'),
    
  ingestCitizenReport: (data: CitizenReportIn): Promise<IngestResult> =>
    post('/api/ingest/citizen', data),
    
  getIncidents: (filters?: IncidentFilters): Promise<IncidentOut[]> =>
    get('/api/incidents', { params: filters }),
    
  getIncident: (id: string): Promise<IncidentDetail> =>
    get(`/api/incidents/${id}`),
    
  approveAssignments: (incidentId: string, request: ApproveRequest): Promise<AssignmentOut[]> =>
    post(`/api/incidents/${incidentId}/approve`, request),
  
  // ... 40+ typed methods
};

async function get<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await fetch(path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, error.detail);
  }
  return response.json();
}
```

### WebSocket Client (`services/ws.ts`)

```typescript
class ResQWebSocket {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;    // Start: 1s
  private maxDelay = 30000;          // Max: 30s
  private alive = true;
  
  connect(role = 'dispatcher') {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/api/ws?role=${role}`;
    
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.reconnectDelay = 1000;  // Reset backoff
      uiStore.setWsStatus('connected');
    };
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WSEnvelope;
      this.dispatch(msg);
    };
    this.ws.onclose = () => {
      uiStore.setWsStatus('disconnected');
      if (this.alive) this.scheduleReconnect();
    };
  }
  
  private dispatch(msg: WSEnvelope) {
    const { type, payload } = msg;
    
    switch (type) {
      case 'incident.upsert':
        incidentStore.upsertIncident(payload as IncidentOut);
        break;
      case 'unit.update':
        unitStore.upsertUnit(payload as UnitOut);
        break;
      case 'alert.new':
      case 'alert.ack':
      case 'alert.resolved':
        alertStore.upsertAlert(payload as AlertOut);
        break;
      case 'notification.new':
        notificationStore.addNotification(payload as NotificationOut);
        break;
      case 'sensor.update':
        sensorStore.upsertSensor(payload as SensorOut);
        break;
      case 'kpi.update':
        kpiStore.setKPIs(payload as KPIData);
        break;
      case 'ping':
        this.ws?.send('ping');  // Respond to keepalive
        break;
    }
  }
  
  private scheduleReconnect() {
    setTimeout(() => {
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    }, this.reconnectDelay);
  }
  
  destroy() {
    this.alive = false;
    this.ws?.close();
  }
}
```

### `useSnapshot` Hook

```typescript
export function useSnapshot() {
  const { replaceAll: setIncidents } = useIncidentStore();
  const { replaceAll: setUnits } = useUnitStore();
  // ...
  
  const fetchAndApply = useCallback(async () => {
    const snapshot = await apiService.getSnapshot();
    setIncidents(snapshot.incidents);
    setUnits(snapshot.units);
    setAlerts(snapshot.alerts);
    setNotifications(snapshot.notifications);
    setSensors(snapshot.sensors);
    setKPIs(snapshot.kpis);
  }, []);
  
  useEffect(() => {
    fetchAndApply();  // Load on mount
  }, [fetchAndApply]);
  
  return { fetchAndApply };  // Exposed for reconnect
}
```

---

## 6. Page: Console (Dispatcher Dashboard)

The primary working interface for EOC operators. Three-column layout:

```
┌─────────────────────────────────────────────────────────────┐
│ KPI Strip (active incidents, P1 count, unit availability)   │
├──────────────┬───────────────────────────┬──────────────────┤
│  Incident    │   Leaflet Map             │  Incident        │
│  Queue       │   (center, ~60% width)    │  Drawer          │
│  (~20%)      │                           │  (~25%, slides)  │
│  Sorted by   │   Incident markers        │                  │
│  priority    │   Unit markers (moving)   │  Selected        │
│              │   Sensor markers          │  incident full   │
│  Filters     │   Heatmap (historic)      │  detail          │
│  bar         │                           │                  │
├──────────────┴───────────────────────────┴──────────────────┤
│ Alerts Panel (collapsible sidebar) + Notification Bell       │
└─────────────────────────────────────────────────────────────┘
```

### KPI Strip (`KPIStrip.tsx`)

Displays real-time metrics updated from `kpi.update` WebSocket events:
- Active incidents (all non-resolved/closed)
- P1 count (highest urgency — red background)
- Units available / total
- Open alerts count
- Average response time

### Incident Queue (`IncidentList.tsx`)

```typescript
function IncidentList() {
  const incidents = useIncidentStore(state => 
    state.incidents
      .filter(i => i.status !== 'closed' && !i.is_historic)
      .sort((a, b) => {
        // Sort by priority first (P1 first)
        const pOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
        if (pOrder[a.priority] !== pOrder[b.priority])
          return pOrder[a.priority] - pOrder[b.priority];
        // Then by created_at (oldest first — longest waiting)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
  );
  
  return (
    <div className="flex flex-col gap-2 overflow-y-auto">
      {incidents.map(inc => (
        <IncidentCard key={inc.id} incident={inc} />
      ))}
    </div>
  );
}
```

### Incident Drawer (`IncidentDrawer.tsx`)

Opens when an incident is selected (from list or map marker). Contains:
- **Header**: Code, type badge, priority badge, status chip
- **SLA Timer**: Live countdown using `setInterval`, color-coded (green/yellow/red)
- **AI Summary Panel**: Button to request summary; streaming display
- **Reports Tab**: All merged reports with source badges, reliability, text
- **Recommendations Tab**: Resource matching results with score bars
- **Assignments Tab**: Current assignment status with unit tracking
- **Shortage Panel**: Highlighted when resource gaps exist
- **Decision Log Accordion**: Full timeline of pipeline decisions
- **Actions**: Approve All, Manual Override (type/severity), Merge, Split

### SLA Countdown

```typescript
function SLACountdown({ dueAt }: { dueAt: string | null }) {
  const [remaining, setRemaining] = useState(computeRemaining(dueAt));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(computeRemaining(dueAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [dueAt]);
  
  const color = remaining < 0 ? 'text-red-500' : 
                remaining < 60 ? 'text-yellow-500' : 'text-green-400';
  
  return (
    <span className={`font-mono text-sm ${color}`}>
      {remaining < 0 ? 'OVERDUE' : formatDuration(remaining)}
    </span>
  );
}
```

---

## 7. Page: Analytics

Charts-heavy view for situational analysis. Components:

### Overview KPI Cards
- Total incidents (all time including historic)
- Total reports
- Deduplication ratio (reports / incidents)
- SLA compliance %
- Average response time

### Charts

| Chart | Type | Data Source |
|---|---|---|
| Incident types | Donut/Pie | `GET /analytics/types` |
| Incidents by week | Area chart | `GET /analytics/timeseries` |
| Response time by type | Bar chart | `GET /analytics/delays` |
| Response time by priority | Grouped bar | `GET /analytics/delays` |
| Source distribution | Pie chart | `GET /analytics/sources` |
| Resource shortages | Horizontal bar | `GET /analytics/shortages` |
| Geographic hotspots | Mini Leaflet map with heatmap | `GET /analytics/hotspots` |

### Recharts Implementation

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function ResponseDelayChart({ data }: { data: DelayByType[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="type" />
        <YAxis label={{ value: 'Minutes', angle: -90 }} />
        <Tooltip />
        <Bar dataKey="avg_assign_min" fill="#4488ff" name="To Assign" />
        <Bar dataKey="avg_arrival_min" fill="#44ff88" name="To Arrival" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## 8. Page: Report (Citizen Intake)

Public-facing form for submitting emergency reports. Mobile-optimized.

### Form Fields
- Emergency type (dropdown: 8 types + "other")
- Description (textarea, required)
- Location (GPS button or manual text entry)
- Name (optional)
- Phone (optional)
- Photo upload (UI only — stored as URL)

### GPS Integration

```typescript
function LocationInput({ onChange }) {
  const [status, setStatus] = useState<'idle' | 'acquiring' | 'acquired' | 'denied'>('idle');
  
  const requestGPS = () => {
    setStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('acquired');
      },
      (err) => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  return (
    <div>
      <Button onClick={requestGPS}>
        {status === 'acquiring' ? 'Acquiring...' : 'Use My Location'}
      </Button>
      {status === 'acquired' && <span className="text-green-400">Location captured</span>}
    </div>
  );
}
```

### Submission & Tracking

After form submission, the citizen receives the `track_id` (TRK-XXXXXXXX) and is redirected to the `/track/{track_id}` page.

---

## 9. Page: Team (Field Interface)

Mobile-optimized interface for field responders. Shows assigned incidents only.

### Team Interface Features
- View current active assignment
- Accept / Reject assignment with optional reason
- Mark as En-Route, Arrived, Completed
- GPS-optional location update (every 30 seconds if enabled)
- Simplified incident summary (no full detail)

### Status Buttons

```typescript
function AssignmentActions({ assignment }: { assignment: AssignmentOut }) {
  const { status } = assignment;
  
  return (
    <div className="flex gap-2">
      {status === 'recommended' && <>
        <Button variant="success" onClick={() => acceptAssignment(assignment.id)}>Accept</Button>
        <Button variant="danger" onClick={() => rejectAssignment(assignment.id)}>Reject</Button>
      </>}
      {status === 'accepted' && 
        <Button onClick={() => updateStatus(assignment.id, 'en_route')}>Mark En Route</Button>}
      {status === 'en_route' && 
        <Button onClick={() => updateStatus(assignment.id, 'arrived')}>Mark Arrived</Button>}
      {status === 'arrived' && 
        <Button onClick={() => updateStatus(assignment.id, 'completed')}>Mark Completed</Button>}
    </div>
  );
}
```

---

## 10. Page: Track (Public Tracking)

Publicly accessible page for tracking a specific incident. URL: `/track/:trackId`

### What's Shown (Public View)
- Incident status (simplified: "Help is on the way" not "en_route")
- Area/location (general area name, no precise coordinates)
- ETA estimate
- Update timeline (chronological public-facing events)

### What's Hidden
- Exact GPS coordinates
- Unit identities
- Resource assignments
- Internal codes (INC-XXXX shown, not incident_id)
- Priority or severity levels

---

## 11. Page: Hospital (Capacity Management)

Interface for hospital staff to update capacity.

### Features
- List of all hospitals with current bed count
- Update `beds_free` via inline edit
- Toggle `on_diversion` flag
- See which incidents are sending patients to this hospital

---

## 12. Page: Simulator

Control panel for demo/testing. Only visible in non-production mode.

### Controls

| Control | Function |
|---|---|
| Start/Stop toggle | Enables/disables ambient feed |
| "Flood" button | Runs full scripted flood scenario |
| "Chemical Fire" button | Runs industrial hazard scenario |
| "Pileup" button | Runs road accident scenario |
| "Sensor Breach" button | Breaches a specific sensor |
| "Duplicate Burst" button | Injects 5 duplicate reports |
| "Fast Forward" toggle | Sets SLA scale to 0.1× |
| "Reset" button | Clears all live data (with confirmation modal) |

### State Display

Shows current simulator state: running/stopped, active scenario, last action.

---

## 13. Map System

### Component: `ResQMap`

The central map component wrapping React-Leaflet with all marker layers.

```typescript
function ResQMap() {
  const incidents = useFilteredIncidents();  // Non-historic, non-closed
  const units = useUnitStore(s => s.units);
  const sensors = useSensorStore(s => s.sensors);
  const historicHotspots = useAnalyticsStore(s => s.hotspots);
  
  return (
    <MapContainer
      center={[22.3039, 73.1815]}   // Vadodara city center
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      
      {historicHotspots && <IncidentHeatmap data={historicHotspots} />}
      
      {incidents.map(inc => (
        <IncidentMarker key={inc.id} incident={inc} />
      ))}
      
      {units.filter(u => u.lat && u.lng).map(unit => (
        <UnitMarker key={unit.id} unit={unit} />
      ))}
      
      {sensors.filter(s => s.lat && s.lng).map(sensor => (
        <SensorMarker key={sensor.id} sensor={sensor} />
      ))}
    </MapContainer>
  );
}
```

### Incident Markers

```typescript
function IncidentMarker({ incident }: { incident: IncidentOut }) {
  const color = PRIORITY_COLORS[incident.priority];  // P1=red, P2=orange, etc.
  const isPulsing = ['new', 'triaged'].includes(incident.status);
  
  const icon = new L.DivIcon({
    html: `<div class="incident-marker ${isPulsing ? 'pulse-animation' : ''}" 
               style="background:${color}">
             <span>${incident.code}</span>
           </div>`,
    className: '',
    iconSize: [80, 30],
  });
  
  return (
    <Marker position={[incident.lat!, incident.lng!]} icon={icon}
            eventHandlers={{ click: () => uiStore.openDrawer(incident.id) }}>
      <Popup>{incident.title}</Popup>
    </Marker>
  );
}
```

### Unit Markers

Different icons based on unit kind (ambulance, fire engine, police, boat, etc.) using emoji or SVG icons. Color indicates status:
- Green: available
- Yellow: assigned/en_route  
- Red: on_scene
- Gray: offline

### Heatmap Layer

```typescript
function IncidentHeatmap({ data }: { data: HotspotData[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!data.length) return;
    
    // Use leaflet.heat plugin
    const heat = L.heatLayer(
      data.map(d => [d.lat, d.lng, d.weight]),
      { radius: 25, blur: 20, maxZoom: 10 }
    );
    heat.addTo(map);
    
    return () => heat.remove();
  }, [data, map]);
  
  return null;
}
```

---

## 14. Component Library

### `Badge` Component

```typescript
type Variant = 'p1' | 'p2' | 'p3' | 'p4' | 'status' | 'type' | 'source';

function Badge({ children, variant }: { children: ReactNode; variant: Variant }) {
  const styles = {
    p1: 'bg-red-500/20 text-red-400 border border-red-500/30',
    p2: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    p3: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    p4: 'bg-green-500/20 text-green-400 border border-green-500/30',
    status: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    type: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    source: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
```

### `Modal` Component

```typescript
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-resq-panel border border-white/10 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

---

## 15. Routing & Navigation

```typescript
// App.tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConsoleLayout />}>
          <Route index element={<Console />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="team" element={<Team />} />
          <Route path="hospital" element={<Hospital />} />
        </Route>
        <Route path="/report" element={<Report />} />   {/* Public */}
        <Route path="/track/:trackId" element={<Track />} /> {/* Public */}
      </Routes>
    </BrowserRouter>
  );
}
```

The `/report` and `/track/:trackId` routes are public-facing (no authentication) and use a simplified layout without the dispatcher nav bar.

---

## 16. Mock Mode Architecture

When `VITE_USE_MOCK=true`, the API client is redirected to in-memory mock data.

```typescript
// services/api.ts
const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const apiService = isMock
  ? mockApiService    // In-memory mock implementation
  : liveApiService;  // Real HTTP calls
```

### Mock Service (`services/mock.ts`)

```typescript
export const mockApiService = {
  getSnapshot: async (): Promise<Snapshot> => ({
    incidents: MOCK_INCIDENTS,
    units: MOCK_UNITS,
    facilities: MOCK_FACILITIES,
    sensors: MOCK_SENSORS,
    alerts: MOCK_ALERTS,
    notifications: MOCK_NOTIFICATIONS,
    kpis: MOCK_KPIS,
    sim: { running: false, scenario: null, message: 'Mock mode' },
  }),
  
  ingestCitizenReport: async (data): Promise<IngestResult> => {
    // Simulate processing delay
    await sleep(500);
    const incident = createMockIncident(data);
    incidentStore.upsertIncident(incident);
    return { report_id: uuid(), incident_id: incident.id, action: 'new', ... };
  },
  
  // ... all other endpoints with mock responses
};
```

The mock service uses the same TypeScript interfaces as the real API service, ensuring type safety in mock mode. A "Demo data" badge is displayed in the UI header when mock mode is active.

---

*This document is part of the ResQGrid documentation package. For API reference, see `Docs/05_API_Reference/`.*
