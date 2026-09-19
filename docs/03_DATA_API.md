# Data Model & API Contract (v1)

## Tables (SQLAlchemy; JSON = SQLite JSON)
- **reports**: id, source(citizen|call|sensor|field|hospital|department), external_id, raw JSON, text, reporter{name,phone}, lat, lng, location_text, location_conf(0-1), reliability, created_at, incident_id FK, classification JSON
- **incidents**: id, code("INC-0001"), type, title, summary, severity(1-5), priority(P1-P4), confidence, status(new|triaged|dispatched|en_route|on_scene|contained|resolved|closed), escalated bool, escalation_level(0-3), lat, lng, area(ward), people_affected, hazards JSON[], report_count, sources JSON[], decision_log JSON[], created_at, triaged_at, first_assigned_at, first_arrival_at, resolved_at, sla_due_at, track_id
- **units** (teams+vehicles): id, name, kind(fire_crew|ambulance|police|rescue|hazmat|utility|traffic|boat|engine|tanker|crane), category(team|vehicle), agency, capabilities JSON[], equipment JSON{item:qty}, crew_size, status(available|assigned|en_route|on_scene|returning|offline), lat, lng, station_id, speed_kmh, fatigue(0-1), phone, current_incident_id
- **facilities**: id, name, kind(hospital|shelter|fire_station|police_station|eq_depot), lat, lng, capabilities JSON[] (trauma,burn,icu,pediatric,toxicology), beds_total, beds_free, on_diversion, contact
- **assignments**: id, incident_id, unit_id|facility_id, requirement_key, score, score_breakdown JSON, eta_min, status(recommended|approved|accepted|en_route|arrived|completed|rejected|cancelled), timestamps
- **shortages**: id, incident_id, subtype, qty_missing, created_at, resolved_at
- **alerts**: id, incident_id, rule, kind(critical|delayed|escalation|sensor|cluster), level(0-3), message, status(open|ack|resolved), created_at, ack_by, ack_at
- **notifications**: id, event, recipient, role, channel(inapp|sms|email|webhook), subject, body, status(sent|mock|failed), incident_id, created_at
- **sensors**: id, kind(flood_gauge|smoke|gas|seismic|traffic), lat, lng, threshold, unit, last_value, last_at, state(ok|warn|breach)
- **audit_events**: id, ts, actor, action, entity, entity_id, data JSON
- **history_incidents**: seeded past incidents (90 d) for analytics — same shape as incidents, flag `is_historic`.

## Enumerations
type: fire, flood, road_accident, medical, industrial_hazard, building_collapse, gas_leak, other · priority: P1 critical (sev5 or sev4+life risk), P2 high, P3 medium, P4 low.

## REST API (`/api`)
| Method | Path | Purpose |
|---|---|---|
| POST | /ingest/citizen · /call · /sensor · /field · /hospital · /department | Ingest a report → runs pipeline → returns `{report_id, incident_id, action: new|merged|related, classification, track_id}` |
| GET | /snapshot | incidents(active) + units + facilities + alerts + kpis (client bootstrap/refetch) |
| GET | /incidents?status&type&priority&source&area | list |
| GET | /incidents/{id} | detail incl. reports, assignments, alerts, decision_log, notifications |
| POST | /incidents/{id}/merge `{other_id}` · /split `{report_id}` | manual dedupe |
| PATCH | /incidents/{id} `{severity?,type?,status?}` | human override (audited) |
| POST | /incidents/{id}/recommend | (re)compute plan |
| POST | /incidents/{id}/approve `{assignment_ids[]|all:true}` | dispatch |
| POST | /assignments/{id}/(accept|reject|status) `{status}` | team actions; reject → re-match next |
| GET/PATCH | /units, /units/{id} · /facilities/{id} | state/capacity updates |
| GET | /alerts?status · POST /alerts/{id}/ack · /escalate | |
| GET | /notifications | outbox |
| GET | /analytics/{overview|types|delays|shortages|hotspots|timeseries|sources} | |
| POST | /ai/incident/{id}/summary · /sop · /brief (global) · /query `{q}` | AI assistance |
| GET | /track/{track_id} | public sanitized status |
| POST | /sim/(start|stop|scenario/{name}|sensor-breach|duplicate-burst|fast-forward|reset) | demo control |
| WS | /ws | realtime events |

## Key payloads
Citizen ingest: `{text, lat?, lng?, location_text?, phone?, name?, photo_url?}`
Sensor ingest: `{sensor_id, kind, value, unit, lat, lng, threshold?}` → breach creates report text "Flood gauge {id} at {value}{unit} exceeds {threshold}".
Classification: `{type, severity, priority, confidence, reasoning, extracted:{people_affected, hazards[], location_text, needs[]}, model:"llm|ml|rules"}`
Recommendation item: `{requirement:{kind,subtype,qty}, matches:[{unit_id,name,eta_min,dist_km,score,breakdown:{proximity,capability,readiness,load}}], shortage:int}`
Alert: `{id,incident_id,kind,rule,level,message,status}`

## Seed data (synthetic, Vadodara)
~14 hospitals (mix of trauma/burn/ICU), 8 fire stations, 6 police stations, 40 units (6 engines, 4 tankers, 10 ambulances, 4 boats, 5 rescue, 2 hazmat, 3 utility, 4 traffic, 2 cranes) + equipment stock, 5 shelters, ~25 sensors (Vishwamitri river gauges, industrial-belt gas/smoke, highway sensors), gazetteer of ~60 landmarks/wards with lat/lng, ~300 historic incidents with realistic hotspots (Vishwamitri riverside, Makarpura GIDC, NH48 bypass, Old City), ~150 labelled training sentences per type for the classifier, SOP JSON per type, requirement templates per type×severity.
