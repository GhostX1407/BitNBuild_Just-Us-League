import {
  Snapshot,
  IncidentOut,
  IncidentDetail,
  UnitOut,
  FacilityOut,
  AlertOut,
  NotificationOut,
  ReportOut,
  AiSummary,
  AiSop,
  AiBrief,
  AiQueryResponse,
  TrackData,
  IngestResponse,
  RecommendationPlan,
  AnalyticsOverview,
  AnalyticsTypeCount,
  AnalyticsDelay,
  AnalyticsShortage,
  AnalyticsHotspot,
  AnalyticsTimeSeries,
  AnalyticsSource,
} from '../types/domain';
import {
  INITIAL_INCIDENTS,
  INITIAL_UNITS,
  INITIAL_FACILITIES,
  INITIAL_SENSORS,
  INITIAL_ALERTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  MOCK_ANALYTICS,
} from './mock';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function safeFetch<T>(url: string, options?: RequestInit, mockFallback?: () => T): Promise<T> {
  if (USE_MOCK && mockFallback) {
    await new Promise((r) => setTimeout(r, 120)); // realistic latency
    return mockFallback();
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Agent': 'ResQGrid-Tactical-Console',
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (mockFallback) {
      return mockFallback();
    }
    throw err;
  }
}

export const api = {
  // Snapshot
  async getSnapshot(): Promise<Snapshot> {
    return safeFetch<Snapshot>('/snapshot', {}, () => ({
      incidents: INITIAL_INCIDENTS,
      units: INITIAL_UNITS,
      facilities: INITIAL_FACILITIES,
      sensors: INITIAL_SENSORS,
      alerts: INITIAL_ALERTS,
      notifications: INITIAL_NOTIFICATIONS,
      kpis: {
        active: INITIAL_INCIDENTS.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length,
        p1: INITIAL_INCIDENTS.filter((i) => i.priority === 'P1').length,
        avg_response_min: 5.8,
        units_available: INITIAL_UNITS.filter((u) => u.status === 'available').length,
        units_total: INITIAL_UNITS.length,
        open_alerts: INITIAL_ALERTS.filter((a) => a.status === 'open').length,
        unmet_requirements: INITIAL_INCIDENTS.reduce((acc, i) => acc + (i.shortages?.length || 0), 0),
        reports_total: 186,
        incidents_total: 42,
      },
      sim: {
        running: false,
        scenario: null,
        message: 'System nominal. Awaiting simulation trigger.',
      },
    }));
  },

  // Incidents
  async getIncidents(): Promise<IncidentOut[]> {
    return safeFetch<IncidentOut[]>('/incidents', {}, () => INITIAL_INCIDENTS);
  },

  async getIncident(id: string): Promise<IncidentDetail> {
    return safeFetch<IncidentDetail>(`/incidents/${id}`, {}, () => {
      const inc = INITIAL_INCIDENTS.find((i) => i.id === id) || INITIAL_INCIDENTS[0];
      const reports = INITIAL_REPORTS[inc.id] || [];
      const related = INITIAL_INCIDENTS.filter((i) => i.id !== inc.id && i.type === inc.type).map((i) => ({
        incident_id: i.id,
        code: i.code,
        score: 0.74,
      }));
      const alerts = INITIAL_ALERTS.filter((a) => a.incident_id === inc.id);
      const notifications = INITIAL_NOTIFICATIONS.filter((n) => n.incident_id === inc.id);
      return {
        ...inc,
        reports,
        related,
        alerts,
        notifications,
      };
    });
  },

  async mergeIncidents(id: string, other_id: string): Promise<{ success: boolean }> {
    return safeFetch(`/incidents/${id}/merge`, { method: 'POST', body: JSON.stringify({ other_id }) }, () => ({
      success: true,
    }));
  },

  async splitIncident(id: string, report_id: string): Promise<{ success: boolean }> {
    return safeFetch(`/incidents/${id}/split`, { method: 'POST', body: JSON.stringify({ report_id }) }, () => ({
      success: true,
    }));
  },

  async overrideIncident(id: string, updates: Partial<IncidentOut>): Promise<IncidentOut> {
    return safeFetch(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, () => {
      const base = INITIAL_INCIDENTS.find((i) => i.id === id) || INITIAL_INCIDENTS[0];
      return { ...base, ...updates };
    });
  },

  async recommend(incidentId: string): Promise<RecommendationPlan> {
    return safeFetch(`/incidents/${incidentId}/recommend`, { method: 'POST' }, () => ({
      items: [
        {
          requirement: { kind: 'vehicle', subtype: 'rescue_boat', qty: 2, mandatory: true },
          matches: [
            {
              unit_id: 'unit-boat-01',
              name: 'NDRF Inflatable Rescue Boat Alpha',
              eta_min: 5,
              dist_km: 1.8,
              score: 0.94,
              breakdown: { proximity: 0.95, capability: 1.0, readiness: 0.9, load: 0.9 },
            },
          ],
          shortage: 1,
        },
      ],
    }));
  },

  async approve(incidentId: string, options: { all?: boolean; assignment_ids?: string[] }): Promise<{ success: boolean }> {
    return safeFetch(`/incidents/${incidentId}/approve`, { method: 'POST', body: JSON.stringify(options) }, () => ({
      success: true,
    }));
  },

  // Assignments
  async updateAssignmentStatus(id: string, status: string): Promise<{ success: boolean }> {
    return safeFetch(`/assignments/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }, () => ({
      success: true,
    }));
  },

  // Ingest
  async ingestCitizen(payload: any): Promise<IngestResponse> {
    return safeFetch('/ingest/citizen', { method: 'POST', body: JSON.stringify(payload) }, () => ({
      report_id: `rep-${Date.now()}`,
      incident_id: INITIAL_INCIDENTS[0].id,
      action: 'merged',
      classification: {
        type: 'flood',
        severity: 4,
        priority: 'P1',
        confidence: 0.92,
        reasoning: 'Extracted high water level and stranded individuals.',
        model: 'groq/llama-3.3-70b',
      },
      track_id: `TRK-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  },

  async ingestCall(payload: any): Promise<IngestResponse> {
    return safeFetch('/ingest/call', { method: 'POST', body: JSON.stringify(payload) }, () => ({
      report_id: `rep-${Date.now()}`,
      incident_id: INITIAL_INCIDENTS[1].id,
      action: 'merged',
      classification: {
        type: 'industrial_hazard',
        severity: 5,
        priority: 'P1',
        confidence: 0.95,
        reasoning: 'Speech transcript flagged chemical explosions and toxic smoke.',
        model: 'groq/llama-3.3-70b',
      },
      track_id: `TRK-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  },

  async ingestField(payload: any): Promise<IngestResponse> {
    return safeFetch('/ingest/field', { method: 'POST', body: JSON.stringify(payload) }, () => ({
      report_id: `rep-${Date.now()}`,
      incident_id: INITIAL_INCIDENTS[0].id,
      action: 'merged',
      classification: {
        type: 'flood',
        severity: 4,
        priority: 'P1',
        confidence: 0.98,
        model: 'field_telemetry',
      },
      track_id: `TRK-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  },

  // Alerts
  async ackAlert(id: string): Promise<AlertOut> {
    return safeFetch(`/alerts/${id}/ack`, { method: 'POST' }, () => {
      const alt = INITIAL_ALERTS.find((a) => a.id === id) || INITIAL_ALERTS[0];
      return { ...alt, status: 'ack', ack_at: new Date().toISOString() };
    });
  },

  async escalateAlert(id: string): Promise<AlertOut> {
    return safeFetch(`/alerts/${id}/escalate`, { method: 'POST' }, () => {
      const alt = INITIAL_ALERTS.find((a) => a.id === id) || INITIAL_ALERTS[0];
      return { ...alt, level: Math.min(3, alt.level + 1) };
    });
  },

  // Facilities
  async updateFacility(id: string, updates: Partial<FacilityOut>): Promise<FacilityOut> {
    return safeFetch(`/facilities/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, () => {
      const fac = INITIAL_FACILITIES.find((f) => f.id === id) || INITIAL_FACILITIES[0];
      return { ...fac, ...updates };
    });
  },

  // Analytics
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return safeFetch('/analytics/overview', {}, () => MOCK_ANALYTICS.overview);
  },
  async getAnalyticsTypes(): Promise<AnalyticsTypeCount[]> {
    return safeFetch('/analytics/types', {}, () => MOCK_ANALYTICS.types);
  },
  async getAnalyticsDelays(): Promise<AnalyticsDelay> {
    return safeFetch('/analytics/delays', {}, () => MOCK_ANALYTICS.delays);
  },
  async getAnalyticsShortages(): Promise<AnalyticsShortage[]> {
    return safeFetch('/analytics/shortages', {}, () => MOCK_ANALYTICS.shortages);
  },
  async getAnalyticsHotspots(): Promise<AnalyticsHotspot[]> {
    return safeFetch('/analytics/hotspots', {}, () => MOCK_ANALYTICS.hotspots);
  },
  async getAnalyticsTimeSeries(): Promise<AnalyticsTimeSeries[]> {
    return safeFetch('/analytics/timeseries', {}, () => MOCK_ANALYTICS.timeseries);
  },
  async getAnalyticsSources(): Promise<AnalyticsSource[]> {
    return safeFetch('/analytics/sources', {}, () => MOCK_ANALYTICS.sources);
  },

  // AI
  async getAiSummary(id: string): Promise<AiSummary> {
    return safeFetch(`/ai/incident/${id}/summary`, { method: 'POST' }, () => ({
      summary:
        'Rapid water inundation in Sayaji Baug area due to Vishwamitri river surge past 26.4ft. Main risks involve electrical hazards and zoo staff evacuation. NDRF boat teams deployed.',
      timeline: [
        '14:02 - Automated River Gauge VG-01 triggered breach alert (>24ft)',
        '14:04 - First citizen call logged reporting stranded personnel near zoo',
        '14:07 - Triage engine classified as P1 Flood; automated recommendation initiated',
        '14:10 - NDRF Boat Alpha dispatched with 2 inflatable watercraft',
      ],
      risks: [
        'Flooded electrical distribution box near Gate 2 posing electrocution threat',
        'Water current velocity exceeding 2.2 m/s near bridge pillars',
        'Possibility of displaced wildlife in flood water',
      ],
      questions: [
        'Confirm if power grid feeder #14 has been isolated by MGVCL electricity board.',
        'Verify exact headcount of zoo handlers remaining on administration building roof.',
      ],
      model: 'groq/llama-3.3-70b (ResQ-Ops)',
    }));
  },

  async getAiSop(id: string): Promise<AiSop> {
    return safeFetch(`/ai/incident/${id}/sop`, { method: 'POST' }, () => ({
      checklist: [
        { step: 'Establish primary water evacuation staging point at Kala Ghoda roundabout', done: true },
        { step: 'Request MGVCL power isolation for Sector 4 transformer grid', done: true },
        { step: 'Deploy motorized rescue boats with sonar depth mapping enabled', done: false },
        { step: 'Prepare SSG Hospital trauma ward for hypothermia and trauma intake', done: true },
        { step: 'Set up temporary citizen holding shelter at Akota Indoor Stadium', done: false },
      ],
      model: 'groq/llama-3.3-70b (ResQ-Ops)',
    }));
  },

  async getAiBrief(): Promise<AiBrief> {
    return safeFetch('/ai/brief', { method: 'POST' }, () => ({
      brief:
        'Operational situation in Vadodara urban district is critically elevated. 2 active P1 emergencies (Sayaji Baug Flood and Makarpura GIDC Chemical Fire) are straining tactical resources. Response readiness is at 84% with 4 HazMat suit shortages recorded.',
      top_risks: [
        'Vishwamitri water levels continuing upward trajectory (0.2ft/hr)',
        'Toxic plume dispersal downwind from Makarpura towards Tarsali residential ward',
        'NH48 traffic congestion impeding ambulance access to Sterling Hospital',
      ],
      reinforcement: [
        'Mobilize 2 additional motorized boats from NDRF Gandhinagar base',
        'Requisition foam bowzers from IOCL Koyali Refinery for chemical containment',
        'Activate auxiliary police cordon teams at NH48 Golden Crossroads',
      ],
      generated_at: new Date().toISOString(),
      model: 'groq/llama-3.3-70b',
    }));
  },

  async queryAi(q: string): Promise<AiQueryResponse> {
    return safeFetch('/ai/query', { method: 'POST', body: JSON.stringify({ q }) }, () => {
      const lower = q.toLowerCase();
      let answer = 'Analyzing current situational intelligence for Vadodara operations...';
      if (lower.includes('boat') || lower.includes('flood')) {
        answer =
          'Currently 1 NDRF boat is active at Sayaji Baug (INC-0101) with an unmet shortage of 2 high-capacity drainage pumps. Recommend transferring 2 auxiliary rafts from the Akota depot.';
      } else if (lower.includes('hospital') || lower.includes('bed')) {
        answer =
          'SSG Hospital has 84 total beds free with active trauma units open. Sterling has 22 beds free. Neither hospital is currently on diversion status.';
      } else if (lower.includes('chemical') || lower.includes('fire') || lower.includes('hazmat')) {
        answer =
          'Makarpura GIDC Chemical Fire (INC-0102) is currently On-Scene with Foam Tender FT-01. A critical shortage of 4 Level-A Hazmat breathing apparatuses is flagged; recommend requisitioning from GSFC petrochemical depot.';
      } else {
        answer = `Regarding "${q}": Operational response is coordinated across 8 active incidents. Priority P1 allocations are currently directed to Vishwamitri flood evacuation and Makarpura toxic containment.`;
      }
      return { answer, model: 'groq/llama-3.3-70b' };
    });
  },

  // Track
  async getTrack(trackId: string): Promise<TrackData> {
    return safeFetch(`/track/${trackId}`, {}, () => ({
      code: 'INC-0101',
      type: 'Flash Flood Evacuation',
      status: 'DISPATCHED — Emergency Crews En Route',
      area: 'Sayaji Baug, Vadodara',
      eta_min: 6,
      updates: [
        { ts: '14:14', text: 'NDRF Inflatable Rescue Boat Alpha dispatched from Fatehgunj station.' },
        { ts: '14:10', text: 'Incident verified by central control room. Severity 5 life hazard confirmed.' },
        { ts: '14:04', text: 'Citizen distress report received and logged into ResQGrid command system.' },
      ],
    }));
  },

  // Simulator
  async triggerSimAction(action: string, payload?: any): Promise<{ success: boolean; message: string }> {
    return safeFetch(`/sim/${action}`, { method: 'POST', body: payload ? JSON.stringify(payload) : undefined }, () => ({
      success: true,
      message: `Simulation command "${action}" executed successfully.`,
    }));
  },
};
