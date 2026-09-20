// ResQGrid Domain Types (Strictly matching Frozen Contract)

export type IncidentType =
  | 'fire'
  | 'flood'
  | 'road_accident'
  | 'medical'
  | 'industrial_hazard'
  | 'building_collapse'
  | 'gas_leak'
  | 'other';

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentStatus =
  | 'new'
  | 'triaged'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'contained'
  | 'resolved'
  | 'closed';

export type UnitStatus =
  | 'available'
  | 'assigned'
  | 'en_route'
  | 'on_scene'
  | 'returning'
  | 'offline';

export type AssignmentStatus =
  | 'recommended'
  | 'approved'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type AlertKind = 'critical' | 'delayed' | 'escalation' | 'sensor' | 'cluster';
export type AlertStatus = 'open' | 'ack' | 'resolved';

export type ReportSource =
  | 'citizen'
  | 'call'
  | 'sensor'
  | 'field'
  | 'hospital'
  | 'department';

export interface ScoreBreakdown {
  proximity: number;
  capability: number;
  readiness: number;
  load: number;
}

export interface AssignmentOut {
  id: string;
  incident_id: string;
  unit_id?: string | null;
  facility_id?: string | null;
  target_name?: string;
  kind?: string;
  requirement_key?: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  eta_min: number;
  status: AssignmentStatus;
}

export interface ShortageItem {
  subtype: string;
  qty_missing: number;
}

export interface DecisionLogEntry {
  ts: string;
  action: string;
  reason: string;
  actor?: string;
}

export interface IncidentOut {
  id: string;
  code: string;
  type: IncidentType;
  title: string;
  summary: string;
  severity: number;
  priority: PriorityLevel;
  confidence: number;
  status: IncidentStatus;
  escalated: boolean;
  escalation_level: number;
  lat: number;
  lng: number;
  area: string;
  people_affected: number;
  hazards: string[];
  report_count: number;
  sources: ReportSource[];
  created_at: string;
  triaged_at?: string | null;
  first_assigned_at?: string | null;
  first_arrival_at?: string | null;
  resolved_at?: string | null;
  sla_due_at: string;
  track_id: string;
  decision_log: DecisionLogEntry[];
  assignments: AssignmentOut[];
  shortages: ShortageItem[];
}

export interface UnitOut {
  id: string;
  name: string;
  kind: string;
  category: 'team' | 'vehicle';
  agency: string;
  capabilities: string[];
  equipment: Record<string, number>;
  crew_size: number;
  status: UnitStatus;
  lat: number;
  lng: number;
  station_id?: string;
  current_incident_id?: string | null;
  fatigue: number;
  phone: string;
  speed_kmh?: number;
}

export interface FacilityOut {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  capabilities: string[];
  beds_total: number;
  beds_free: number;
  on_diversion: boolean;
  contact: string;
}

export interface SensorOut {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  threshold: number;
  unit: string;
  last_value: number;
  last_at: string;
  state: 'ok' | 'warn' | 'breach';
}

export interface AlertOut {
  id: string;
  incident_id?: string | null;
  kind: AlertKind;
  rule: string;
  level: number;
  message: string;
  status: AlertStatus;
  created_at: string;
  ack_at?: string | null;
}

export interface NotificationOut {
  id: string;
  event: string;
  recipient: string;
  role: string;
  channel: 'inapp' | 'sms' | 'email' | 'webhook';
  subject: string;
  body: string;
  status: 'sent' | 'mock' | 'failed';
  incident_id?: string | null;
  created_at: string;
}

export interface ReportOut {
  id: string;
  source: ReportSource;
  text: string;
  lat?: number | null;
  lng?: number | null;
  location_text?: string;
  reliability: number;
  created_at: string;
  incident_id?: string | null;
  classification?: {
    type: IncidentType;
    severity: number;
    priority: PriorityLevel;
    confidence: number;
    reasoning?: string;
    extracted?: {
      people_affected?: number;
      hazards?: string[];
      location_text?: string;
      needs?: string[];
    };
    model?: string;
  };
}

export interface IncidentDetail extends IncidentOut {
  reports: ReportOut[];
  related: Array<{ incident_id: string; code: string; score: number }>;
  alerts: AlertOut[];
  notifications: NotificationOut[];
}

export interface Kpis {
  active: number;
  p1: number;
  avg_response_min: number;
  units_available: number;
  units_total: number;
  open_alerts: number;
  unmet_requirements: number;
  reports_total?: number;
  incidents_total?: number;
}

export interface SimState {
  running: boolean;
  scenario?: string | null;
  message?: string;
}

export interface Snapshot {
  incidents: IncidentOut[];
  units: UnitOut[];
  facilities: FacilityOut[];
  sensors: SensorOut[];
  alerts: AlertOut[];
  notifications: NotificationOut[];
  kpis: Kpis;
  sim: SimState;
}

export interface AnalyticsOverview {
  total_incidents: number;
  total_reports: number;
  dedupe_ratio: number;
  avg_response_min: number;
  sla_compliance_pct: number;
  open_alerts: number;
  top_type: string;
}

export interface AnalyticsTypeCount {
  type: string;
  count: number;
}

export interface AnalyticsDelay {
  by_type: Array<{ type: string; avg_assign_min: number; avg_arrival_min: number }>;
  by_priority: Array<{ priority: string; avg_assign_min: number; avg_arrival_min: number; sla_pct: number }>;
}

export interface AnalyticsShortage {
  subtype: string;
  demand: number;
  available: number;
  unmet_count: number;
}

export interface AnalyticsHotspot {
  area: string;
  lat: number;
  lng: number;
  count: number;
  weight: number;
}

export interface AnalyticsTimeSeries {
  bucket: string;
  count: number;
  p1: number;
}

export interface AnalyticsSource {
  source: string;
  count: number;
}

export interface AiSummary {
  summary: string;
  timeline: string[];
  risks: string[];
  questions: string[];
  model?: string;
}

export interface AiSop {
  checklist: Array<{ step: string; done: boolean }>;
  model?: string;
}

export interface AiBrief {
  brief: string;
  top_risks: string[];
  reinforcement: string[];
  generated_at: string;
  model?: string;
}

export interface AiQueryResponse {
  answer: string;
  model?: string;
}

export interface TrackData {
  code: string;
  type: string;
  status: string;
  area: string;
  eta_min: number;
  updates: Array<{ ts: string; text: string }>;
}

export interface IngestResponse {
  report_id: string;
  incident_id: string;
  action: 'new' | 'merged' | 'related';
  classification: any;
  track_id: string;
}

export interface RecommendationMatch {
  unit_id: string;
  name: string;
  eta_min: number;
  dist_km: number;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface RecommendationItem {
  requirement: {
    kind: string;
    subtype: string;
    qty: number;
    mandatory?: boolean;
  };
  matches: RecommendationMatch[];
  shortage: number;
}

export interface RecommendationPlan {
  items: RecommendationItem[];
}
