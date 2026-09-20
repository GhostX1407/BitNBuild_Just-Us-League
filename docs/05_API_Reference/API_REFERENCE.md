# ResQGrid — API Reference

> **Complete REST API and WebSocket Event Reference**
> Base URL: `http://localhost:8000/api` | WebSocket: `ws://localhost:8000/api/ws`

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication & Headers](#2-authentication--headers)
3. [Common Response Shapes](#3-common-response-shapes)
4. [Ingestion Endpoints](#4-ingestion-endpoints)
5. [Incident Endpoints](#5-incident-endpoints)
6. [Units & Facilities Endpoints](#6-units--facilities-endpoints)
7. [Dispatch & Assignment Endpoints](#7-dispatch--assignment-endpoints)
8. [Snapshot & KPI Endpoint](#8-snapshot--kpi-endpoint)
9. [Alert Endpoints](#9-alert-endpoints)
10. [Notification Endpoints](#10-notification-endpoints)
11. [Analytics Endpoints](#11-analytics-endpoints)
12. [AI Assistance Endpoints](#12-ai-assistance-endpoints)
13. [Public Tracking Endpoint](#13-public-tracking-endpoint)
14. [Simulator Endpoints](#14-simulator-endpoints)
15. [WebSocket Events](#15-websocket-events)
16. [Error Responses](#16-error-responses)
17. [Enumeration Values](#17-enumeration-values)

---

## 1. API Overview

ResQGrid exposes a RESTful JSON API under the `/api` prefix with WebSocket support for real-time events.

### Base URL
```
http://localhost:8000/api
```

### Interactive Documentation
FastAPI auto-generates OpenAPI documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### Conventions
- All request/response bodies are `application/json`
- Timestamps are UTC ISO-8601 strings with timezone: `"2024-01-15T10:30:00+00:00"`
- IDs are UUID4 strings: `"550e8400-e29b-41d4-a716-446655440000"`
- Distances are in kilometres
- Durations are in minutes
- Scores are normalized 0.0–1.0
- Errors are `{"detail": "error message"}`

---

## 2. Authentication & Headers

**No authentication is required** for the current version. All endpoints are publicly accessible.

Standard request headers:
```http
Content-Type: application/json
Accept: application/json
```

---

## 3. Common Response Shapes

### IncidentOut
```json
{
  "id": "string (UUID)",
  "code": "INC-0001",
  "type": "fire | flood | road_accident | medical | industrial_hazard | building_collapse | gas_leak | other",
  "title": "string",
  "summary": "string | null",
  "severity": 1,
  "priority": "P1 | P2 | P3 | P4",
  "confidence": 0.85,
  "status": "new | triaged | dispatched | en_route | on_scene | contained | resolved | closed",
  "escalated": false,
  "escalation_level": 0,
  "lat": 22.3102,
  "lng": 73.1888,
  "area": "Vishwamitri",
  "people_affected": 5,
  "hazards": ["trapped", "chemical"],
  "report_count": 3,
  "sources": ["citizen", "call"],
  "created_at": "2024-01-15T10:30:00+00:00",
  "triaged_at": "2024-01-15T10:30:01+00:00",
  "first_assigned_at": "2024-01-15T10:30:05+00:00",
  "first_arrival_at": "2024-01-15T10:35:00+00:00",
  "resolved_at": null,
  "sla_due_at": "2024-01-15T10:32:00+00:00",
  "track_id": "TRK-XXXXXXXX",
  "decision_log": [
    {
      "ts": "2024-01-15T10:30:00+00:00",
      "stage": "create",
      "reason": "New incident from first citizen report",
      "type": "flood",
      "severity": 4,
      "priority": "P1"
    }
  ],
  "assignments": [
    {
      "id": "string (UUID)",
      "incident_id": "string",
      "unit_id": "string | null",
      "facility_id": "string | null",
      "target_name": "Fire Engine Alpha",
      "kind": "vehicle",
      "requirement_key": "engine_x2",
      "score": 0.87,
      "score_breakdown": {
        "proximity": 0.95,
        "capability": 1.0,
        "readiness": 0.80,
        "load": 0.85
      },
      "eta_min": 4.5,
      "status": "recommended | approved | accepted | en_route | arrived | completed | rejected | cancelled"
    }
  ],
  "shortages": [
    {"subtype": "hazmat", "qty_missing": 2}
  ]
}
```

### UnitOut
```json
{
  "id": "string (UUID)",
  "name": "Ambulance Unit 3",
  "kind": "ambulance",
  "category": "vehicle",
  "agency": "VMSS",
  "capabilities": ["trauma", "icu"],
  "equipment": {"oxygen_cylinder": 5, "stretcher": 2},
  "crew_size": 3,
  "status": "available | assigned | en_route | on_scene | returning | offline",
  "lat": 22.3102,
  "lng": 73.1888,
  "station_id": "station-central-1",
  "current_incident_id": null,
  "fatigue": 0.2,
  "phone": "+91-98765-43210"
}
```

### FacilityOut
```json
{
  "id": "string (UUID)",
  "name": "SSG Hospital",
  "kind": "hospital | shelter | fire_station | police_station | eq_depot",
  "lat": 22.3072,
  "lng": 73.1812,
  "capabilities": ["trauma", "burn", "icu", "pediatric", "toxicology"],
  "beds_total": 200,
  "beds_free": 45,
  "on_diversion": false,
  "contact": "+91-265-2222000"
}
```

### AlertOut
```json
{
  "id": "string (UUID)",
  "incident_id": "string | null",
  "kind": "critical | delayed | escalation | sensor | cluster",
  "rule": "R0_P1_CRITICAL",
  "level": 0,
  "message": "Critical P1 emergency INC-0001: Flood at Vishwamitri",
  "status": "open | ack | resolved",
  "created_at": "2024-01-15T10:30:00+00:00",
  "ack_at": null,
  "ack_by": null
}
```

### ReportOut
```json
{
  "id": "string (UUID)",
  "source": "citizen | call | sensor | field | hospital | department",
  "text": "River is flooding near Vishwamitri bridge",
  "lat": 22.3102,
  "lng": 73.1888,
  "location_text": "Vishwamitri Bridge",
  "reliability": 0.6,
  "created_at": "2024-01-15T10:30:00+00:00",
  "incident_id": "string",
  "classification": {
    "type": "flood",
    "severity": 4,
    "priority": "P1",
    "confidence": 0.92,
    "reasoning": "High water level description with stranded persons",
    "extracted": {
      "people_affected": 3,
      "hazards": ["stranded"],
      "location_text": "Vishwamitri Bridge",
      "needs": ["rescue_boat"]
    },
    "model": "llm"
  }
}
```

---

## 4. Ingestion Endpoints

### POST /ingest/citizen

Ingest a citizen emergency report.

**Request Body:**
```json
{
  "text": "string (required) — description of the emergency",
  "lat": 22.3102,
  "lng": 73.1888,
  "location_text": "optional location description",
  "phone": "+91-98765-43210",
  "name": "John Doe",
  "photo_url": "https://example.com/photo.jpg"
}
```

**Response:** `200 OK`
```json
{
  "report_id": "string (UUID)",
  "incident_id": "string (UUID)",
  "action": "new | merged | related",
  "classification": {
    "type": "flood",
    "severity": 4,
    "priority": "P1",
    "confidence": 0.92,
    "reasoning": "...",
    "extracted": {"people_affected": 3, "hazards": ["stranded"], "location_text": "...", "needs": ["..."]},
    "model": "llm | ml | rules"
  },
  "track_id": "TRK-XXXXXXXX"
}
```

**Side effects:**
- Creates `Report` record
- Creates or updates `Incident` record
- Publishes `incident.upsert` WebSocket event
- Triggers resource recommendation (async)
- Triggers SLA evaluation (async)
- Triggers notifications (async)

---

### POST /ingest/call

Ingest a simulated emergency call transcript.

**Request Body:**
```json
{
  "caller_phone": "+91-98765-44332",
  "transcript": "string (required) — call transcript text",
  "location_text": "optional location",
  "lat": 22.3102,
  "lng": 73.1888
}
```

**Response:** Same as `/ingest/citizen`

---

### POST /ingest/sensor

Ingest an IoT sensor reading.

**Request Body:**
```json
{
  "sensor_id": "sensor-fld-001",
  "kind": "flood_gauge | smoke | gas | seismic | traffic",
  "value": 9.4,
  "unit": "m",
  "threshold": 8.0,
  "lat": 22.3102,
  "lng": 73.1888
}
```

**Behavior:**
- Generates text: `"Flood gauge sensor-fld-001 at 9.4m exceeds threshold 8.0m"`
- Forces classification type based on sensor kind
- Sets reliability to 0.9 (high)

**Response:** Same as `/ingest/citizen`

---

### POST /ingest/field

Ingest a field team report.

**Request Body:**
```json
{
  "unit_id": "unit-fire-001",
  "incident_id": "optional — links to existing incident",
  "text": "string (required) — field observations",
  "lat": 22.3102,
  "lng": 73.1888,
  "status": "optional — new status for the unit"
}
```

**Response:** Same as `/ingest/citizen`

---

### POST /ingest/hospital

Ingest a hospital capacity or surge report.

**Request Body:**
```json
{
  "facility_id": "facility-hospital-001",
  "text": "Receiving multiple burn casualties from chemical fire",
  "beds_free": 12,
  "incoming_patients": 5
}
```

**Response:** Same as `/ingest/citizen`

---

### POST /ingest/department

Ingest a government agency advisory.

**Request Body:**
```json
{
  "agency": "IMD Vadodara",
  "text": "Heavy rain warning: Vishwamitri river likely to exceed danger level",
  "lat": 22.3102,
  "lng": 73.1888,
  "location_text": "Vadodara City"
}
```

**Response:** Same as `/ingest/citizen`

---

## 5. Incident Endpoints

### GET /incidents

List all incidents with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status (e.g., "new", "dispatched") |
| `type` | string | Filter by incident type (e.g., "flood", "fire") |
| `priority` | string | Filter by priority ("P1", "P2", "P3", "P4") |
| `source` | string | Filter by source channel |
| `area` | string | Filter by ward/area name |
| `include_historic` | boolean | Include seeded historic incidents (default: false) |
| `limit` | integer | Maximum results (default: 200, max: 1000) |

**Response:** `200 OK` — `List[IncidentOut]` sorted by priority (P1 first) then creation time (oldest first)

---

### GET /incidents/{incident_id}

Get detailed information for a single incident.

**Path Parameters:** `incident_id` — UUID string

**Response:** `200 OK` — `IncidentDetail`
```json
{
  // All IncidentOut fields plus:
  "reports": [ReportOut, ...],
  "related": [
    {"incident_id": "string", "code": "INC-0002", "score": 0.55}
  ],
  "alerts": [AlertOut, ...],
  "notifications": [NotificationOut, ...]
}
```

**Error:** `404` — Incident not found

---

### POST /incidents/{incident_id}/merge

Manually merge two incidents (absorbs `other_id` into `incident_id`).

**Request Body:**
```json
{"other_id": "string (UUID) — incident to absorb"}
```

**Behavior:**
- Moves all reports from `other_id` to `incident_id`
- Recomputes `report_count`, `sources`, `severity`, `people_affected`, `hazards`
- Recalculates priority
- Sets `other_id` status to "closed"
- Creates audit event

**Response:** `200 OK` — Updated `IncidentOut`

**Errors:** `400` (merge with self), `404` (incident not found)

---

### POST /incidents/{incident_id}/split

Split a report out of an incident into a new incident.

**Request Body:**
```json
{"report_id": "string (UUID) — report to split out"}
```

**Behavior:**
- Creates a new incident from the specified report
- Removes report from original incident
- Recomputes priority for both incidents
- Creates audit event

**Response:** `200 OK`
```json
{
  "original": IncidentOut,
  "new": IncidentOut
}
```

---

### PATCH /incidents/{incident_id}

Human override of incident properties.

**Request Body** (all fields optional):
```json
{
  "severity": 4,
  "type": "industrial_hazard",
  "status": "contained",
  "escalated": true
}
```

**Validation:**
- `type` must be in valid types
- `status` must be in valid statuses
- `severity` must be 1–5

**Behavior:**
- Applies changes to incident
- Recalculates priority
- Creates audit event with `actor="dispatcher"`
- Publishes `incident.upsert` WebSocket event

**Response:** `200 OK` — Updated `IncidentOut`

---

## 6. Units & Facilities Endpoints

### GET /units

List all response units.

**Query Parameters:** `status`, `kind`, `category`

**Response:** `200 OK` — `List[UnitOut]`

---

### GET /units/{unit_id}

Get single unit details.

**Response:** `200 OK` — `UnitOut` | `404`

---

### PATCH /units/{unit_id}

Update unit status, location, or fatigue level.

**Request Body** (all optional):
```json
{
  "status": "available",
  "lat": 22.3102,
  "lng": 73.1888,
  "fatigue": 0.3,
  "current_incident_id": null
}
```

**Response:** `200 OK` — Updated `UnitOut`

---

### GET /facilities

List all facilities.

**Query Parameters:** `kind`

**Response:** `200 OK` — `List[FacilityOut]`

---

### PATCH /facilities/{facility_id}

Update facility capacity or diversion status.

**Request Body** (all optional):
```json
{
  "beds_free": 15,
  "on_diversion": false,
  "contact": "+91-265-2222000"
}
```

**Response:** `200 OK` — Updated `FacilityOut`

---

## 7. Dispatch & Assignment Endpoints

### POST /incidents/{incident_id}/recommend

Compute or refresh the resource recommendation plan for an incident.

**No request body required.**

**Behavior:**
- Loads requirement templates for `(incident.type, incident.severity)`
- Scores all available units against each requirement
- Creates `Assignment` records with status `"recommended"`
- Creates `Shortage` records for unmet requirements
- Publishes `incident.upsert` with updated assignments

**Response:** `200 OK`
```json
{
  "items": [
    {
      "requirement": {
        "kind": "vehicle",
        "subtype": "engine",
        "qty": 2,
        "mandatory": true
      },
      "matches": [
        {
          "unit_id": "string",
          "name": "Fire Engine Alpha",
          "eta_min": 4.5,
          "dist_km": 2.8,
          "score": 0.87,
          "breakdown": {
            "proximity": 0.95,
            "capability": 1.0,
            "readiness": 0.80,
            "load": 0.85
          }
        }
      ],
      "shortage": 0
    }
  ]
}
```

---

### POST /incidents/{incident_id}/approve

Dispatcher approves recommended assignments for dispatch.

**Request Body:**
```json
{
  "all": true,
  "assignment_ids": ["uuid1", "uuid2"]
}
```

Use `"all": true` to approve all recommended assignments, or specify individual IDs. Cannot use both simultaneously.

**Behavior:**
- Sets approved assignments to status `"approved"`
- Updates units to `status: "assigned"`
- Records `first_assigned_at` on incident (if not set)
- Creates `AuditEvent` with `actor="dispatcher"`
- Publishes `incident.upsert` WebSocket event

**Response:** `200 OK` — `List[AssignmentOut]`

---

### POST /assignments/{assignment_id}/accept

Field team accepts a dispatched assignment.

**No request body required.**

**Behavior:**
- Sets assignment status to `"accepted"`
- Creates `AuditEvent`

**Response:** `200 OK` — `AssignmentOut` | `404`

---

### POST /assignments/{assignment_id}/reject

Field team rejects an assignment.

**Query Parameters:** `reason=string`

**Behavior:**
- Sets assignment status to `"rejected"`
- Triggers automatic re-recommendation for the incident
- Creates `AuditEvent`

**Response:** `200 OK`
```json
{"status": "rejected", "message": "Assignment rejected, re-recommendation triggered"}
```

---

### POST /assignments/{assignment_id}/status

Update assignment lifecycle status.

**Request Body:**
```json
{"status": "en_route | arrived | completed | cancelled"}
```

**Status Transitions & Side Effects:**

| New Status | Side Effects |
|---|---|
| `en_route` | Unit status → `en_route`; records `en_route_at` |
| `arrived` | Unit status → `on_scene`; records `arrived_at`; updates `first_arrival_at` on incident |
| `completed` | Unit status → `returning`; records `completed_at`; checks if incident can be auto-resolved |
| `cancelled` | Unit status → `available`; removes `current_incident_id` |

**Response:** `200 OK` — `AssignmentOut` | `404`

---

## 8. Snapshot & KPI Endpoint

### GET /snapshot

Returns the full current state for client bootstrap and reconnect.

**Response:** `200 OK`
```json
{
  "incidents": [IncidentOut, ...],
  "units": [UnitOut, ...],
  "facilities": [FacilityOut, ...],
  "sensors": [SensorOut, ...],
  "alerts": [AlertOut, ...],
  "notifications": [NotificationOut, ...],
  "kpis": {
    "active": 5,
    "p1": 2,
    "avg_response_min": 7.3,
    "units_available": 28,
    "units_total": 40,
    "open_alerts": 3,
    "unmet_requirements": 1,
    "reports_total": 47,
    "incidents_total": 12
  },
  "sim": {
    "running": false,
    "scenario": null,
    "message": "Ready"
  }
}
```

**Notes:**
- `incidents`: Active incidents + incidents resolved in the last 60 minutes (excludes historic seed data)
- `alerts`: Open and acknowledged alerts only
- `notifications`: Last 50 notifications (newest first)
- `units`: All units regardless of status
- `sensors`: All sensors

---

## 9. Alert Endpoints

### GET /alerts

List alerts.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `open`, `ack`, `resolved` |
| `incident_id` | string | Filter by incident |

**Response:** `200 OK` — `List[AlertOut]`

---

### POST /alerts/{alert_id}/ack

Acknowledge an alert.

**Request Body:**
```json
{"ack_by": "John Dispatcher"}
```

**Behavior:**
- Sets `status: "ack"`
- Records `ack_at` and `ack_by`
- Stops escalation ladder progression
- Publishes `alert.ack` WebSocket event

**Response:** `200 OK` — Updated `AlertOut`

---

### POST /alerts/{alert_id}/escalate

Manually escalate an alert to the next level.

**No request body required.**

**Behavior:**
- Increments `level` by 1 (max 3)
- Updates `Incident.escalation_level` if alert has an associated incident
- Sets `Incident.escalated = True`
- Publishes updated `alert.new` WebSocket event

**Response:** `200 OK` — Updated `AlertOut`

---

## 10. Notification Endpoints

### GET /notifications

List notification outbox.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `incident_id` | string | Filter by incident |
| `channel` | string | Filter by channel: `inapp`, `sms`, `email` |
| `status` | string | Filter by status: `sent`, `mock`, `failed` |
| `limit` | integer | Max results (default: 100) |

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "event": "alert.critical",
    "recipient": "Duty Operator",
    "role": "dispatcher",
    "channel": "inapp",
    "subject": "CRITICAL ALERT: INC-0001 (P1)",
    "body": "High priority alert for INC-0001 in Vishwamitri: ...",
    "status": "sent | mock | failed",
    "incident_id": "string | null",
    "created_at": "2024-01-15T10:30:00+00:00"
  }
]
```

---

## 11. Analytics Endpoints

### GET /analytics/overview

Top-level KPI metrics across all incidents (historic + live).

**Response:** `200 OK`
```json
{
  "total_incidents": 312,
  "total_reports": 1247,
  "dedupe_ratio": 3.99,
  "avg_response_min": 8.2,
  "sla_compliance_pct": 78.5,
  "open_alerts": 3,
  "top_type": "Flood"
}
```

---

### GET /analytics/types

Incident distribution by emergency type.

**Response:** `200 OK`
```json
[
  {"type": "flood", "count": 87, "percentage": 27.9},
  {"type": "fire", "count": 72, "percentage": 23.1},
  {"type": "road_accident", "count": 65, "percentage": 20.8}
]
```

---

### GET /analytics/delays

Response time analysis by type and priority.

**Response:** `200 OK`
```json
{
  "by_type": [
    {"type": "flood", "avg_assign_min": 3.2, "avg_arrival_min": 9.7},
    {"type": "fire", "avg_assign_min": 2.1, "avg_arrival_min": 6.3}
  ],
  "by_priority": [
    {"priority": "P1", "avg_assign_min": 1.8, "avg_arrival_min": 5.2, "sla_pct": 91.3},
    {"priority": "P2", "avg_assign_min": 3.4, "avg_arrival_min": 8.1, "sla_pct": 83.7},
    {"priority": "P3", "avg_assign_min": 6.2, "avg_arrival_min": 14.5, "sla_pct": 72.1},
    {"priority": "P4", "avg_assign_min": 11.7, "avg_arrival_min": 22.3, "sla_pct": 65.4}
  ]
}
```

---

### GET /analytics/shortages

Resource shortage analysis.

**Response:** `200 OK`
```json
[
  {"subtype": "hazmat", "demand": 5, "available": 2, "unmet_count": 1},
  {"subtype": "boat", "demand": 8, "available": 4, "unmet_count": 0}
]
```

---

### GET /analytics/hotspots

Geographic incident concentration by ward/area.

**Response:** `200 OK`
```json
[
  {"area": "Vishwamitri", "lat": 22.3102, "lng": 73.1888, "count": 47, "weight": 1.0},
  {"area": "Makarpura", "lat": 22.2510, "lng": 73.1889, "count": 38, "weight": 0.81}
]
```

---

### GET /analytics/timeseries

Weekly incident trend over last 90 days.

**Response:** `200 OK`
```json
[
  {"bucket": "Oct 15", "count": 28, "p1": 4},
  {"bucket": "Oct 22", "count": 31, "p1": 6},
  {"bucket": "Oct 29", "count": 24, "p1": 3}
]
```

12 weekly buckets, oldest first.

---

### GET /analytics/sources

Report source channel breakdown.

**Response:** `200 OK`
```json
[
  {"source": "citizen", "count": 587, "percentage": 47.1},
  {"source": "call", "count": 312, "percentage": 25.0},
  {"source": "sensor", "count": 215, "percentage": 17.2},
  {"source": "field", "count": 133, "percentage": 10.7}
]
```

---

## 12. AI Assistance Endpoints

### POST /ai/incident/{incident_id}/summary

Generate an AI situation summary for an incident.

**No request body required.**

**Response:** `200 OK`
```json
{
  "summary": "A severe flooding event at Vishwamitri Riverside has been confirmed with multiple reports of stranded residents and submerged vehicles. Response is underway with rescue boats deployed.",
  "timeline": [
    {"ts": "2024-01-15T10:30:00+00:00", "text": "Incident created from sensor breach"},
    {"ts": "2024-01-15T10:31:00+00:00", "text": "Merged 4 citizen reports"}
  ],
  "risks": ["Stranded persons — priority rescue", "Electrical hazards from submerged infrastructure"],
  "questions": [
    "Are residents stranded?",
    "Is access road submerged?",
    "What is the water depth?"
  ],
  "model": "llm | template"
}
```

**Caching:** Cached by `(incident_id, report_count)`. Cache is invalidated when new reports merge.

---

### POST /ai/incident/{incident_id}/sop

Generate a Standard Operating Procedure checklist.

**No request body required.**

**Response:** `200 OK`
```json
{
  "checklist": [
    {"step": "Establish command post upwind of flood zone", "done": false},
    {"step": "Deploy rescue boats to stranded residential areas", "done": false},
    {"step": "Coordinate with NDRF for swift water rescue", "done": false}
  ],
  "model": "llm | template"
}
```

---

### POST /ai/brief

Generate a global situation brief.

**No request body required.**

**Response:** `200 OK`
```json
{
  "brief": "7 active incidents citywide with 2 P1 emergencies. Hotspot concentration at Vishwamitri (3 incidents) and Makarpura GIDC (2 incidents). HazMat resource shortage is the critical constraint.",
  "top_risks": [
    "Unresolved HazMat shortage affecting chemical fire response",
    "Vishwamitri flood expanding — residential evacuation may be needed"
  ],
  "reinforcement": [
    "Request mutual aid for HazMat from neighboring districts",
    "Pre-position rescue boats near Vishwamitri before next tide"
  ],
  "generated_at": "2024-01-15T10:30:00+00:00",
  "model": "llm | template"
}
```

**TTL:** 30 seconds cache.

---

### POST /ai/query

Answer a natural-language question about current incidents.

**Request Body:**
```json
{"q": "How many boats do we need?"}
```

**Response:** `200 OK`
```json
{
  "answer": "Currently 4 rescue boats are required across 2 active flood incidents. 2 boats are deployed and en-route. There is a shortage of 2 boats flagged.",
  "model": "llm | template"
}
```

---

## 13. Public Tracking Endpoint

### GET /track/{track_id}

Public-facing incident status (no sensitive data exposed).

**Path Parameters:** `track_id` — TRK-XXXXXXXX format string

**Response:** `200 OK`
```json
{
  "code": "INC-0001",
  "type": "flood",
  "status": "en_route",
  "area": "Vishwamitri",
  "eta_min": 8.5,
  "updates": [
    {"ts": "2024-01-15T10:30:00+00:00", "text": "Emergency services notified"},
    {"ts": "2024-01-15T10:30:05+00:00", "text": "Resources dispatched"},
    {"ts": "2024-01-15T10:33:00+00:00", "text": "Units en route to your location"}
  ]
}
```

**Error:** `404` — Track ID not found

---

## 14. Simulator Endpoints

### GET /sim/state

Get current simulator state.

**Response:** `200 OK`
```json
{
  "running": false,
  "scenario": null,
  "message": "Ready",
  "autopilot": true,
  "ambient": false
}
```

---

### POST /sim/start

Start the simulator (enables ambient feed and autopilot).

**Response:** `200 OK` — Simulator state dict

---

### POST /sim/stop

Stop the simulator (disables ambient feed).

**Response:** `200 OK` — Simulator state dict

---

### POST /sim/scenario/{name}

Run a scripted emergency scenario.

**Path Parameters:** `name` — `flood | chemical_fire | pileup`

**Behavior by scenario:**

**flood**: 
1. Breach `sensor-fld-001` (Vishwamitri gauge at 9.4m vs 8.0m threshold)
2. Ingest 6 citizen reports near Vishwamitri Bridge (within 300m, merge into 1 incident)
3. Ingest 2 emergency calls with flood descriptions
4. Ingest 1 field report confirming breach
5. All reports merge into a single P1 flood incident

**chemical_fire**:
1. Breach gas and smoke sensors at Makarpura GIDC
2. Ingest 5 citizen reports of chemical fire and explosion
3. Ingest 1 emergency call from plant safety manager
4. Creates P1 industrial_hazard incident; HazMat shortage triggers

**pileup**:
1. Breach traffic sensor on NH48
2. Ingest 4 citizen reports of multi-vehicle crash
3. Creates P2-P1 road_accident incident

**Response:** `200 OK`
```json
{"status": "started", "scenario": "flood"}
```

---

### POST /sim/sensor-breach

Force a specific sensor into breach state and ingest a report.

**Request Body:**
```json
{"sensor_id": "sensor-fld-001"}
```

(Omitting `sensor_id` defaults to `"sensor-fld-001"`)

**Response:** `200 OK`
```json
{
  "status": "breached",
  "sensor": {
    "id": "sensor-fld-001",
    "kind": "flood_gauge",
    "last_value": 9.8,
    "state": "breach"
  }
}
```

---

### POST /sim/duplicate-burst

Inject 5 duplicate reports about the same location.

**Request Body:**
```json
{"incident_id": "optional — to use that incident's coordinates"}
```

**Response:** `200 OK`
```json
{"status": "burst_injected", "count": 5}
```

---

### POST /sim/fast-forward

Adjust the SLA time scale for accelerated demo.

**Request Body:**
```json
{"scale": 0.1}
```

A scale of 0.1 means SLA timers run at 10× speed (a 10-minute SLA expires in 1 minute).

**Response:** `200 OK`
```json
{"status": "fast_forward_active", "sla_time_scale": 0.1}
```

---

### POST /sim/reset

Reset the system to initial seeded state.

**Behavior:**
- Deletes all non-historic incidents, reports, assignments, alerts, notifications, audit events
- Restores all units to `available` status
- Restores all facilities to non-diversion
- Restores all sensors to `ok` state
- Resets simulator state

**Response:** `200 OK`
```json
{"status": "reset_complete"}
```

> ⚠️ This is a destructive operation. All live data is deleted.

---

## 15. WebSocket Events

### Connection

```
ws://localhost:8000/api/ws?role=dispatcher
```

Query parameter `role` can be:
- `dispatcher` — Full access dispatcher view
- `team:{unit_id}` — Field team view for specific unit
- `public:{track_id}` — Public tracking view

### Message Format

All messages from server are JSON objects:
```json
{
  "type": "event.type.name",
  "ts": "2024-01-15T10:30:00+00:00",
  "payload": { /* event-specific data */ }
}
```

### Keepalive

The server sends a `{"type": "ping", ...}` every 20 seconds. Clients should respond with `"ping"` or `{"type": "ping"}`.

### Event Types

| Event Type | Payload | Trigger |
|---|---|---|
| `connection.established` | `{message, role}` | On successful connection |
| `incident.upsert` | `IncidentOut` | Any incident state change |
| `report.new` | `ReportOut` | New report saved |
| `unit.update` | `UnitOut` | Unit position or status change |
| `sensor.update` | `SensorOut` | Sensor value or state change |
| `alert.new` | `AlertOut` | New alert or level escalation |
| `alert.ack` | `AlertOut` | Alert acknowledged |
| `alert.resolved` | `AlertOut` | Alert resolved |
| `notification.new` | `NotificationOut` | New in-app notification |
| `kpi.update` | KPI dict | KPI metrics changed |
| `sim.state` | Sim state dict | Simulator state changed |

### SensorOut Payload
```json
{
  "id": "sensor-fld-001",
  "kind": "flood_gauge",
  "lat": 22.3102,
  "lng": 73.1888,
  "threshold": 8.0,
  "unit": "m",
  "last_value": 9.4,
  "last_at": "2024-01-15T10:30:00+00:00",
  "state": "ok | warn | breach"
}
```

### Example WebSocket Client (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws?role=dispatcher');

ws.onopen = () => {
  console.log('Connected to ResQGrid realtime stream');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  switch (msg.type) {
    case 'incident.upsert':
      incidentStore.upsertIncident(msg.payload);
      break;
    case 'unit.update':
      unitStore.upsertUnit(msg.payload);
      break;
    case 'alert.new':
      alertStore.addAlert(msg.payload);
      if (msg.payload.kind === 'critical') {
        showCriticalToast(msg.payload.message);
      }
      break;
    case 'ping':
      ws.send('ping');
      break;
  }
};

ws.onclose = () => {
  // Reconnect with exponential backoff
  scheduleReconnect();
};
```

---

## 16. Error Responses

### Standard Error Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Common Causes |
|---|---|---|
| `200` | OK | Successful request |
| `400` | Bad Request | Invalid input values (merge with self, invalid status) |
| `404` | Not Found | Incident, unit, facility, or assignment does not exist |
| `422` | Unprocessable Entity | Pydantic validation failure (missing required field, wrong type) |
| `500` | Internal Server Error | Unexpected server error (rare, logged) |

### 422 Validation Error Example
```json
{
  "detail": [
    {
      "type": "string_type",
      "loc": ["body", "text"],
      "msg": "Input should be a valid string",
      "input": null
    }
  ]
}
```

---

## 17. Enumeration Values

### Incident Type
`fire` | `flood` | `road_accident` | `medical` | `industrial_hazard` | `building_collapse` | `gas_leak` | `other`

### Incident Status
`new` | `triaged` | `dispatched` | `en_route` | `on_scene` | `contained` | `resolved` | `closed`

### Priority
`P1` (critical, 2-min SLA) | `P2` (high, 5-min SLA) | `P3` (medium, 10-min SLA) | `P4` (low, 20-min SLA)

### Unit Kind
`fire_crew` | `ambulance` | `police` | `rescue` | `hazmat` | `utility` | `traffic` | `boat` | `engine` | `tanker` | `crane`

### Unit Category
`team` | `vehicle`

### Unit Status
`available` | `assigned` | `en_route` | `on_scene` | `returning` | `offline`

### Facility Kind
`hospital` | `shelter` | `fire_station` | `police_station` | `eq_depot`

### Assignment Status
`recommended` | `approved` | `accepted` | `en_route` | `arrived` | `completed` | `rejected` | `cancelled`

### Alert Kind
`critical` | `delayed` | `escalation` | `sensor` | `cluster`

### Alert Status
`open` | `ack` | `resolved`

### Alert Level / Escalation Ladder
- `0` — Dispatcher
- `1` — Shift Supervisor
- `2` — District Commander
- `3` — State Authority / NDRF

### Report Source
`citizen` | `call` | `sensor` | `field` | `hospital` | `department`

### Notification Channel
`inapp` | `sms` | `email` | `webhook`

### Notification Status
`sent` | `mock` | `failed`

### Sensor Kind
`flood_gauge` | `smoke` | `gas` | `seismic` | `traffic`

### Sensor State
`ok` | `warn` | `breach`

### Classification Model
`llm` | `ml` | `rules`

---

*This API reference is auto-generated from the ResQGrid codebase. For interactive API testing, open `http://localhost:8000/docs` when the backend is running.*
