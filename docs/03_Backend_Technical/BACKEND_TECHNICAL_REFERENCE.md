# ResQGrid — Backend Technical Reference

> **Deep-Dive Technical Documentation for All Backend Services**
> Covers: every service module, its logic, algorithms, and internal design decisions

---

## Table of Contents

1. [Ingest Pipeline (`pipeline.py`)](#1-ingest-pipeline-pipelinepy)
2. [Classification Service (`classify.py`)](#2-classification-service-classifypy)
3. [Geocoding Service (`geocode.py`)](#3-geocoding-service-geocodepy)
4. [Deduplication Service (`dedupe.py`)](#4-deduplication-service-dedupepy)
5. [Priority Computation (`priority.py`)](#5-priority-computation-prioritypy)
6. [Resource Recommendation (`recommend.py`)](#6-resource-recommendation-recommendpy)
7. [Dispatch Service (`dispatch.py`)](#7-dispatch-service-dispatchpy)
8. [SLA Monitoring (`sla.py`)](#8-sla-monitoring-slapy)
9. [Notification Router (`notify.py`)](#9-notification-router-notifypy)
10. [AI Assistance Service (`ai_assist.py`)](#10-ai-assistance-service-ai_assistpy)
11. [Analytics Engine (`analytics.py`)](#11-analytics-engine-analyticspy)
12. [Simulator Engine (`simulator.py`)](#12-simulator-engine-simulatorpy)
13. [Geographic Utilities (`geo.py`)](#13-geographic-utilities-geopy)
14. [LLM Client (`core/llm.py`)](#14-llm-client-corellmpy)
15. [Event System (`core/events.py`)](#15-event-system-coreeventsspy)

---

## 1. Ingest Pipeline (`pipeline.py`)

The central orchestrator for all incoming emergency report processing.

### Primary Function: `ingest_report`

```python
async def ingest_report(source: str, payload: dict) -> dict:
    """
    Returns: {
        report_id: str,
        incident_id: str,
        action: "new" | "merged" | "related",
        classification: dict,
        track_id: str
    }
    Never raises — catch-all at service boundary.
    """
```

### Stage 1: Input Normalization

Different source channels require different normalization:

| Source | Text Field Extraction |
|---|---|
| `citizen` | `payload["text"]` |
| `call` | `payload["transcript"]` |
| `sensor` | Auto-generated: `"Flood gauge {id} at {value}{unit} exceeds {threshold}"` |
| `field` | `payload["text"]` |
| `hospital` | `payload["text"]` |
| `department` | `payload["text"]` |

Sensor text generation:
```python
def _sensor_text(payload: dict) -> str:
    kind = payload.get("kind", "sensor")
    sensor_id = payload.get("sensor_id", "unknown")
    value = payload.get("value", 0)
    unit = payload.get("unit", "")
    threshold = payload.get("threshold", 0)
    return f"{kind.title()} {sensor_id} at {value}{unit} exceeds threshold {threshold}{unit}"
```

### Stage 2: Idempotency Check

Reports are identified by `(source, external_id)`. If a report with the same combination already exists, the pipeline returns the existing record without reprocessing.

For citizen/call/department reports without `external_id`, a UUID is assigned as `external_id`.

```python
# Check for existing report
existing = await session.scalar(
    select(Report).where(
        Report.source == source,
        Report.external_id == external_id
    )
)
if existing:
    return {
        "report_id": existing.id,
        "incident_id": existing.incident_id,
        "action": "duplicate",
        ...
    }
```

### Stage 3: Reliability Assignment

Source-to-reliability weight mapping:
```python
RELIABILITY = {
    "field": 0.95,
    "sensor": 0.90,
    "department": 0.90,
    "hospital": 0.80,
    "call": 0.80,
    "citizen": 0.60,
}
```

### Stage 4: Geocode + Classify (Parallel)

These two operations are independent and are dispatched concurrently:

```python
# Can run in parallel (no dependency between them)
geo_result, cls_result = await asyncio.gather(
    geocode.resolve(payload, source),
    classify.classify(text, source, payload),
)
```

### Stage 5: Dedupe Lock + Merge/Create

See `dedupe.py` section for scoring details. The lock prevents concurrent races:

```python
async with _ingestion_lock:
    report = await _save_report(session, text, geo_result, cls_result, reliability)
    
    # Find matching incidents
    candidates = await dedupe.find_candidates(session, report, cls_result)
    
    if candidates and candidates[0][1] >= MERGE_T:
        incident, score = candidates[0]
        await _merge_report_into(session, incident, report, cls_result, score)
        action = "merged"
    elif candidates and candidates[0][1] >= RELATED_T:
        incident = await _create_or_get_primary(session, candidates, report, cls_result)
        action = "related"
    else:
        incident = await _create_incident(session, report, cls_result)
        action = "new"
    
    await session.commit()
```

### Stage 6: Post-Pipeline (Non-blocking)

```python
# All three are fire-and-forget
asyncio.ensure_future(recommend.plan(incident.id))
asyncio.ensure_future(sla.evaluate_incident(incident.id))
asyncio.ensure_future(notify.route(
    "incident.created" if action == "new" else "incident.updated",
    incident.id,
    {"action": action}
))

# Also publish WebSocket event
await bus.publish("incident.upsert", await serialize_incident(session, incident))
```

### Helper: `serialize_incident`

Converts an `Incident` ORM object to a complete `IncidentOut` dict with nested assignments and shortages:

```python
async def serialize_incident(session: AsyncSession, incident: Incident) -> dict:
    # Load assignments
    asgns = await session.execute(
        select(Assignment)
        .where(Assignment.incident_id == incident.id)
        .where(Assignment.status.notin_(["rejected", "cancelled"]))
    )
    
    # Load shortages
    shortages = await session.execute(
        select(Shortage).where(Shortage.incident_id == incident.id, Shortage.resolved_at.is_(None))
    )
    
    return {
        "id": incident.id,
        "code": incident.code,
        "type": incident.type,
        # ... all other fields ...
        "assignments": [serialize_assignment(a) for a in asgns.scalars()],
        "shortages": [{"subtype": s.subtype, "qty_missing": s.qty_missing} for s in shortages.scalars()],
    }
```

---

## 2. Classification Service (`classify.py`)

### Entry Point

```python
async def classify(text: str, source: str, payload: dict) -> dict:
    """Always returns a valid classification dict. Never raises."""
```

### Sensor Fast Path

If `source == "sensor"`, the classification bypasses LLM and ML entirely:

```python
_SENSOR_TYPE_MAP = {
    "flood_gauge": "flood",
    "smoke": "fire",
    "gas": "gas_leak",
    "seismic": "building_collapse",
    "traffic": "road_accident",
}

def _sensor_severity(payload: dict) -> int:
    ratio = payload.get("value", 0) / max(payload.get("threshold", 1), 0.001)
    if ratio >= 2.0: return 5
    if ratio >= 1.5: return 4
    if ratio >= 1.2: return 3
    if ratio >= 1.0: return 2
    return 1
```

### LLM Classification Path

System prompt is designed for structured JSON output:
- Explicitly names valid type values to constrain hallucination
- Defines severity scale with concrete criteria
- Labels user text as "data, not instructions"

### ML Fallback Path

Uses `TfidfVectorizer(ngram_range=(1,2))` + `LogisticRegression` trained at startup. Model is held in module-level globals:

```python
_vectorizer: TfidfVectorizer | None = None
_classifier: LogisticRegression | None = None

def train_classifier():
    global _vectorizer, _classifier
    # ... training code ...
```

The `train_classifier()` function is called from `app.main` lifespan startup.

### Safety Floor

After any classification path (LLM, ML, or rules), the severity safety floor is applied:

```python
_SEVERITY_FLOORS = {
    5: ["explosion", "mass casualty", "toxic cloud", "building collapse"],
    4: ["trapped", "critically injured", "not breathing", "chemical fire",
        "multiple casualties", "children trapped"],
    3: ["injured", "unconscious", "fire spreading"],
}

def _apply_severity_floor(text: str, severity: int) -> int:
    lower = text.lower()
    for floor in sorted(_SEVERITY_FLOORS.keys(), reverse=True):
        if any(cue in lower for cue in _SEVERITY_FLOORS[floor]):
            return max(severity, floor)
    return severity
```

This means: if the text contains "children trapped" and the ML model returns severity 2, the final severity is raised to 4.

---

## 3. Geocoding Service (`geocode.py`)

### Gazetteer Index Build

At module import time, the gazetteer is loaded and indexed:

```python
_GAZETTEER: list[dict] = []
_INDEX: dict[str, dict] = {}  # lowercase name/alias → entry

def _build_index():
    for entry in _GAZETTEER:
        _INDEX[entry["name"].lower()] = entry
        for alias in entry.get("aliases", []):
            _INDEX[alias.lower()] = entry

_build_index()  # Runs at import
```

### Exact Match Algorithm

Finds the **longest** key in `_INDEX` that appears as a substring of the input text:

```python
def _exact_match(text: str) -> tuple[dict, float] | None:
    lower = text.lower()
    best_key = None
    best_len = 0
    for key in _INDEX:
        if key in lower and len(key) > best_len:
            best_key = key
            best_len = len(key)
    if best_key:
        return _INDEX[best_key], 0.9
    return None
```

Longest-match prevents "road" matching instead of "RC Dutt Road" when both appear in the text.

### Fuzzy Match Algorithm

Uses `difflib.get_close_matches` and `SequenceMatcher`:

```python
def _fuzzy_match(text: str) -> tuple[dict, float] | None:
    # Word-by-word fuzzy matching
    words = text.lower().split()
    for word in words:
        if len(word) < 4:
            continue  # Skip short words like "the", "a", "is"
        matches = get_close_matches(word, _INDEX.keys(), n=1, cutoff=0.75)
        if matches:
            ratio = SequenceMatcher(None, word, matches[0]).ratio()
            conf = max(0.6, min(0.8, ratio))
            return _INDEX[matches[0]], conf
    return None
```

### Radius-Based Area Assignment

When explicit coordinates are provided, the nearest gazetteer entry (within radius) determines the `area` field:

```python
def _assign_area(lat: float, lng: float) -> str | None:
    best_area = None
    best_dist = float("inf")
    
    for entry in _GAZETTEER:
        if not (entry.get("lat") and entry.get("lng")):
            continue
        d = haversine_km(lat, lng, entry["lat"], entry["lng"])
        if d < best_dist and d <= 2.0:  # Within 2km radius
            best_dist = d
            best_area = entry.get("ward") or entry.get("name")
    
    return best_area or "Vadodara"
```

---

## 4. Deduplication Service (`dedupe.py`)

### Candidate Query

The candidate query fetches all non-historic, non-resolved, recent incidents:

```python
cutoff = now_utc - timedelta(hours=1)  # 60-minute window

candidates_q = (
    select(Incident)
    .where(Incident.is_historic == False)
    .where(Incident.status.notin_(["resolved", "closed"]))
    .where(Incident.created_at >= cutoff)
    .order_by(Incident.created_at.desc())
)
```

### Score Computation

For each candidate incident, four scores are computed:

```python
def _score(incident: Incident, report_lat, report_lng, report_text, cls_type, location_uncertain) -> float:
    # 1. Geographic score
    geo, dist = _geo_score(incident.lat, incident.lng, report_lat, report_lng, incident.type, location_uncertain)
    
    # 2. Text score (TF-IDF cosine)
    inc_texts = [r.text for r in incident.reports if r.text]
    inc_texts.append(incident.title or "")
    text = _text_score(inc_texts, report_text)
    
    # 3. Type compatibility
    typ = _type_score(incident.type, cls_type)
    
    # 4. Time recency
    time = _time_score(incident.created_at)
    
    # Weighted combination
    score = 0.40 * geo + 0.35 * text + 0.15 * typ + 0.10 * time
    
    # Proximity override: 200m + compatible type → force merge
    if dist is not None and dist <= 0.2 and typ >= 0.5 and not location_uncertain:
        score = max(score, MERGE_T)
    
    return score
```

### Returning Results

```python
async def find_candidates(session, report, classification) -> list[tuple[Incident, float]]:
    """Returns list of (incident, score) sorted by score descending."""
    candidates = (await session.execute(candidates_q)).scalars().all()
    
    scored = []
    for inc in candidates:
        score = _score(inc, report.lat, report.lng, report.text, classification["type"], ...)
        if score >= RELATED_T:  # Only return if above related threshold
            scored.append((inc, score))
    
    return sorted(scored, key=lambda x: x[1], reverse=True)
```

---

## 5. Priority Computation (`priority.py`)

### SLA Base Times

```python
SLA_BASE = {
    "P1": 2,    # minutes
    "P2": 5,    # minutes
    "P3": 10,   # minutes
    "P4": 20,   # minutes
}
```

### Priority Logic

```python
_LIFE_RISK_HAZARDS = {"trapped", "chemical", "explosion", "mass", "not breathing", "critically"}

def compute_priority(severity: int, people_affected: int, hazards: list[str],
                     report_count: int, sources: list[str]) -> tuple[str, int]:
    
    # Base priority from severity
    if severity >= 5:
        priority = "P1"
    elif severity == 4:
        # P1 if life risk indicators present
        has_life_risk = (
            people_affected > 0 or
            any(h in " ".join(hazards).lower() for h in _LIFE_RISK_HAZARDS)
        )
        priority = "P1" if has_life_risk else "P2"
    elif severity == 3:
        priority = "P3"
    else:
        priority = "P4"
    
    # Corroboration bump: ≥3 reports OR ≥2 distinct sources
    if report_count >= 3 or len(set(sources)) >= 2:
        # Advance one level (P4→P3, P3→P2, P2→P1, P1→P1)
        _LEVELS = ["P4", "P3", "P2", "P1"]
        idx = _LEVELS.index(priority)
        priority = _LEVELS[min(idx + 1, len(_LEVELS) - 1)]
    
    sla_minutes = SLA_BASE[priority]
    return priority, sla_minutes
```

---

## 6. Resource Recommendation (`recommend.py`)

### Requirement Templates

Templates are stored in `data/templates.json` (or defined inline) as a nested dict:

```python
TEMPLATES = {
    "fire": {
        1: [  # severity 1
            {"kind": "vehicle", "subtype": "engine", "qty": 1, "mandatory": True},
            {"kind": "team", "subtype": "fire_crew", "qty": 1, "mandatory": True},
        ],
        # ... 2, 3, 4, 5 ...
        5: [  # severity 5 (critical)
            {"kind": "vehicle", "subtype": "engine", "qty": 3, "mandatory": True},
            {"kind": "vehicle", "subtype": "tanker", "qty": 2, "mandatory": True},
            {"kind": "team", "subtype": "hazmat", "qty": 1, "mandatory": True},
            {"kind": "team", "subtype": "rescue", "qty": 2, "mandatory": True},
            {"kind": "vehicle", "subtype": "ambulance", "qty": 2, "mandatory": False},
            {"kind": "facility", "subtype": "burn", "qty": 1, "mandatory": False},
        ],
    },
    "flood": { ... },
    # ... other types ...
}
```

### Unit Scoring

```python
def _score_unit(unit: Unit, incident: Incident, required_subtype: str) -> float:
    # 1. Proximity → ETA → proximity score
    dist_km = haversine_km(unit.lat, unit.lng, incident.lat, incident.lng)
    eta_min = dist_km / (unit.speed_kmh / 60)
    proximity = max(0.0, 1.0 - eta_min / MAX_ETA_MIN)  # MAX_ETA_MIN = 30
    
    # 2. Capability
    has_cap = required_subtype in unit.capabilities or unit.kind == required_subtype
    capability = 1.0 if has_cap else 0.0
    
    # 3. Readiness
    readiness = 1.0 - unit.fatigue
    
    # 4. Load balance
    # Prefer units with fewer concurrent assignments
    assignment_count = _count_active_assignments(unit)
    load = max(0.0, 1.0 - assignment_count / 3.0)  # Penalty increases with concurrent assignments
    
    return 0.45 * proximity + 0.25 * capability + 0.15 * readiness + 0.15 * load
```

### Shortage Creation

When no units meet a mandatory requirement:

```python
for req in template:
    available = _get_available_units(session, req["subtype"])
    if len(available) < req["qty"] and req["mandatory"]:
        shortage_qty = req["qty"] - len(available)
        shortage = Shortage(
            id=str(uuid4()),
            incident_id=incident_id,
            subtype=req["subtype"],
            qty_missing=shortage_qty,
            created_at=now_utc()
        )
        session.add(shortage)
```

---

## 7. Dispatch Service (`dispatch.py`)

### Assignment Lifecycle

The dispatch service manages the state machine for assignments:

```
recommended → approved → accepted → en_route → arrived → completed
                       └→ rejected (triggers re-recommendation)
             └→ cancelled
```

### Approve Function

```python
async def approve(incident_id: str, assignment_ids: list[str] | None, all_assignments: bool) -> list[dict]:
    """Dispatcher approves recommended assignments."""
    async with SessionLocal() as session:
        if all_assignments:
            assignments = await session.execute(
                select(Assignment)
                .where(Assignment.incident_id == incident_id)
                .where(Assignment.status == "recommended")
            )
        else:
            assignments = await session.execute(
                select(Assignment)
                .where(Assignment.id.in_(assignment_ids))
                .where(Assignment.status == "recommended")
            )
        
        approved = []
        for asgn in assignments.scalars():
            asgn.status = "approved"
            asgn.approved_at = now_utc()
            
            # Update unit status
            if asgn.unit_id:
                unit = await session.get(Unit, asgn.unit_id)
                unit.status = "assigned"
                unit.current_incident_id = incident_id
            
            approved.append(asgn)
        
        # Update incident first_assigned_at
        incident = await session.get(Incident, incident_id)
        if not incident.first_assigned_at:
            incident.first_assigned_at = now_utc()
        
        # Audit
        session.add(AuditEvent(actor="dispatcher", action="assignment.approved", ...))
        
        await session.commit()
        
        # Publish event
        await bus.publish("incident.upsert", await serialize_incident(session, incident))
        
        return [serialize_assignment(a) for a in approved]
```

### Reject with Re-recommendation

```python
async def reject(assignment_id: str, reason: str = "") -> None:
    """Field unit rejects; triggers automatic re-recommendation."""
    async with SessionLocal() as session:
        asgn = await session.get(Assignment, assignment_id)
        if not asgn:
            return
        
        asgn.status = "rejected"
        if asgn.unit_id:
            unit = await session.get(Unit, asgn.unit_id)
            unit.status = "available"
            unit.current_incident_id = None
        
        session.add(AuditEvent(actor="field_team", action="assignment.rejected", data={"reason": reason}, ...))
        await session.commit()
        
        # Re-recommend
        asyncio.ensure_future(recommend.plan(asgn.incident_id))
```

---

## 8. SLA Monitoring (`sla.py`)

### Background Loop

```python
_SLA_INTERVAL = 5.0  # seconds
_task: asyncio.Task | None = None

async def _sla_loop():
    while True:
        try:
            await asyncio.sleep(_SLA_INTERVAL)
            await _run_sla_checks()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("SLA loop failed: %s", e)

def start(app):
    global _task
    _task = asyncio.ensure_future(_sla_loop())

def stop():
    if _task:
        _task.cancel()
```

### Alert Rule Implementations

**R0 — P1 Critical** (fires immediately on P1 creation):
```python
async def _check_r0(session, incident):
    if incident.priority == "P1" or incident.severity >= 5:
        await _upsert_alert(session, incident.id, "R0_P1_CRITICAL", "critical",
                           f"Critical P1 emergency {incident.code}: {incident.title}")
```

**R1 — Unassigned SLA** (fires when SLA deadline passes with no assignment):
```python
async def _check_r1(session, incident):
    if not incident.sla_due_at:
        return
    if incident.first_assigned_at:
        return  # Already assigned
    if now_utc() > incident.sla_due_at:
        await _upsert_alert(session, incident.id, "R1_UNASSIGNED_SLA", "delayed",
                           f"Incident {incident.code} unassigned past SLA deadline")
```

**R2 — Assignment Not En-Route** (fires when approved but unit hasn't started moving):
```python
async def _check_r2(session, incident):
    approved_not_moving = await session.execute(
        select(Assignment)
        .where(Assignment.incident_id == incident.id)
        .where(Assignment.status == "approved")
        .where(Assignment.approved_at < now_utc() - timedelta(minutes=2 * sla_scale))
    )
    for asgn in approved_not_moving.scalars():
        rule = f"R2_ASSIGNED_NOT_ENROUTE_{asgn.id[:8]}"
        await _upsert_alert(session, incident.id, rule, "delayed", ...)
```

### Escalation Advancement

```python
async def _advance_escalation(session):
    """Advances unacknowledged alerts through the escalation ladder."""
    THRESHOLDS = {0: 5, 1: 10, 2: 15}  # minutes before promoting to next level
    
    open_alerts = await session.execute(
        select(Alert).where(Alert.status == "open", Alert.level < 3)
    )
    
    for alert in open_alerts.scalars():
        age_min = (now_utc() - alert.created_at).total_seconds() / 60
        threshold = THRESHOLDS.get(alert.level)
        if threshold and age_min > threshold * sla_scale:
            alert.level += 1
            if alert.incident_id:
                incident = await session.get(Incident, alert.incident_id)
                if incident:
                    incident.escalation_level = max(incident.escalation_level, alert.level)
                    incident.escalated = True
            
            # Notify new escalation level recipient
            asyncio.ensure_future(notify.route("alert.escalation", alert.incident_id, {"level": alert.level}))
```

### Alert Deduplication

```python
async def _upsert_alert(session, incident_id, rule, kind, message):
    """Create or skip alert — prevents duplicate alerts for same rule + incident."""
    existing = await session.scalar(
        select(Alert)
        .where(Alert.incident_id == incident_id)
        .where(Alert.rule == rule)
        .where(Alert.status.in_(["open", "ack"]))
    )
    if existing:
        return  # Already have an open alert for this rule
    
    alert = Alert(
        id=str(uuid4()),
        incident_id=incident_id,
        rule=rule,
        kind=kind,
        level=0,
        message=message,
        status="open",
        created_at=now_utc()
    )
    session.add(alert)
    
    # Publish WebSocket event
    asyncio.ensure_future(bus.publish("alert.new", serialize_alert(alert)))
    
    # Trigger notification
    asyncio.ensure_future(notify.route("alert.critical" if kind == "critical" else "alert.delayed",
                                        incident_id, {"alert_id": alert.id, "message": message}))
```

---

## 9. Notification Router (`notify.py`)

### Channel Router

```python
async def route(event: str, incident_id: str | None, data: dict) -> None:
    """Routes notification to all configured channels. Never raises."""
    
    # Determine escalation level from alert data or incident
    level = data.get("level", 0)
    
    # Load recipients from templates
    role = ESCALATION_ROLES[level]
    recipient_info = RECIPIENTS[role]
    
    # Message rendering
    subject, body = _render_message(event, incident_id, data, recipient_info)
    
    # Create notification record
    notif = await _save_notification(event, incident_id, recipient_info, subject, body)
    
    # Dispatch to channels (independently, non-blocking)
    await _try_inapp(event, incident_id, subject, body)
    
    if settings.TWILIO_ACCOUNT_SID:
        asyncio.ensure_future(_try_sms(recipient_info["phone"], body))
    else:
        await _mock_channel("sms", notif)
    
    if settings.SMTP_HOST:
        asyncio.ensure_future(_try_email(recipient_info["email"], subject, body))
    else:
        await _mock_channel("email", notif)
```

### SMS Dispatch

```python
async def _try_sms(to: str, body: str) -> None:
    """Sends SMS via Twilio. Creates notification record. Never raises."""
    try:
        async with httpx.AsyncClient() as client:
            for attempt in range(2):
                try:
                    r = await client.post(
                        f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                        data={"To": to, "From": settings.TWILIO_FROM, "Body": body[:1600]},
                        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                        timeout=10.0,
                    )
                    r.raise_for_status()
                    await _update_notification_status("sent")
                    return
                except Exception:
                    if attempt == 1:
                        raise
                    await asyncio.sleep(1.0)
    except Exception as e:
        logger.warning("SMS failed: %s", e)
        await _update_notification_status("failed")
```

---

## 10. AI Assistance Service (`ai_assist.py`)

### Summary Cache

```python
_summary_cache: dict[tuple, dict] = {}

async def get_summary(incident_id: str) -> dict:
    incident = await _load_incident(incident_id)
    
    # Cache key: invalidated when new reports merge (report_count changes)
    key = (incident_id, incident.report_count)
    if key in _summary_cache:
        return _summary_cache[key]
    
    # Build context for LLM
    ctx = {
        "code": incident.code,
        "type": incident.type,
        "severity": incident.severity,
        "area": incident.area,
        "report_count": incident.report_count,
        "people_affected": incident.people_affected,
        "hazards": incident.hazards,
        "status": incident.status,
        "recent_reports": [r.text for r in incident.reports[-5:]],  # Last 5 reports
        "recent_decisions": incident.decision_log[-5:],
    }
    
    result = await complete_json(
        prompt=f"Summarise this incident: {json.dumps(ctx)}",
        system=_SUMMARY_SYSTEM,
        cache_key=f"summary:{incident_id}:{incident.report_count}"
    )
    
    if result:
        result["model"] = "llm"
        _summary_cache[key] = result
        return result
    
    return _template_summary(incident)
```

### Brief Cache (TTL-based)

```python
_brief_cache: dict | None = None
_brief_cached_at: float = 0.0
_BRIEF_TTL = 30.0  # seconds

async def get_brief() -> dict:
    now = time.monotonic()
    if _brief_cache and now - _brief_cached_at < _BRIEF_TTL:
        return _brief_cache  # Return cached if within TTL
    
    # Rebuild context from live DB
    ctx = await _build_global_context()
    
    result = await complete_json(
        prompt=f"Generate a situation brief: {json.dumps(ctx)}",
        system=_BRIEF_SYSTEM
    )
    
    if result:
        _brief_cache = result
        _brief_cached_at = now
        return result
    
    return _template_brief(ctx)
```

---

## 11. Analytics Engine (`analytics.py`)

### Overview Query

```python
async def get_overview() -> dict:
    async with SessionLocal() as session:
        total_incidents = await session.scalar(select(func.count(Incident.id)))
        total_reports = await session.scalar(select(func.count(Report.id)))
        
        # Deduplication ratio
        dedupe_ratio = round(total_reports / max(total_incidents, 1), 2)
        
        # SLA compliance: incidents where first_arrival < sla_due
        compliant = await session.scalar(
            select(func.count(Incident.id))
            .where(Incident.first_arrival_at.is_not(None))
            .where(Incident.sla_due_at.is_not(None))
            .where(Incident.first_arrival_at <= Incident.sla_due_at)
        )
        total_with_arrival = await session.scalar(
            select(func.count(Incident.id))
            .where(Incident.first_arrival_at.is_not(None))
        )
        sla_pct = round(100 * compliant / max(total_with_arrival, 1), 1)
        
        return {
            "total_incidents": total_incidents,
            "total_reports": total_reports,
            "dedupe_ratio": dedupe_ratio,
            "sla_compliance_pct": sla_pct,
            ...
        }
```

### Hotspot Query

```python
async def get_hotspots() -> list[dict]:
    async with SessionLocal() as session:
        rows = await session.execute(
            select(Incident.area, func.count().label("count"))
            .where(Incident.area.is_not(None))
            .group_by(Incident.area)
            .order_by(func.count().desc())
            .limit(20)
        )
        
        result = []
        max_count = 0
        for area, count in rows.all():
            entry = _gazetteer_lookup(area)  # Get lat/lng for the area
            max_count = max(max_count, count)
            result.append({"area": area, "lat": entry["lat"], "lng": entry["lng"], "count": count})
        
        # Normalize weights
        for r in result:
            r["weight"] = round(r["count"] / max_count, 2)
        
        return result
```

---

## 12. Simulator Engine (`simulator.py`)

### State Object

```python
_state = {
    "running": False,
    "scenario": None,
    "message": "Ready",
    "autopilot": True,
    "ambient": False,
}

def get_state() -> dict:
    return dict(_state)
```

### Unit Mover Loop

```python
_MOVER_INTERVAL = 2.0  # seconds

async def _mover_loop():
    while True:
        try:
            await asyncio.sleep(_MOVER_INTERVAL)
            await _advance_units()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("Mover loop failed: %s", e)

async def _advance_units():
    """Move en_route units toward their incident; advance autopilot stages."""
    async with SessionLocal() as session:
        # Get approved assignments (autopilot: start moving after 3s)
        approved = await session.execute(
            select(Assignment).where(Assignment.status == "approved")
            .where(Assignment.approved_at < now_utc() - timedelta(seconds=3))
        )
        for asgn in approved.scalars():
            # Auto-advance to en_route
            asgn.status = "en_route"
            asgn.en_route_at = now_utc()
            if asgn.unit_id:
                unit = await session.get(Unit, asgn.unit_id)
                unit.status = "en_route"
        
        # Move en_route units
        en_route = await session.execute(
            select(Assignment, Unit)
            .join(Unit, Assignment.unit_id == Unit.id)
            .where(Assignment.status == "en_route")
        )
        for asgn, unit in en_route.all():
            incident = await session.get(Incident, asgn.incident_id)
            if not incident:
                continue
            
            # Move unit toward incident (10% of remaining distance per tick)
            delta_lat = (incident.lat - unit.lat) * 0.1
            delta_lng = (incident.lng - unit.lng) * 0.1
            unit.lat += delta_lat
            unit.lng += delta_lng
            
            # Check arrival (within 100m)
            dist = haversine_km(unit.lat, unit.lng, incident.lat, incident.lng)
            if dist < 0.1:
                asgn.status = "arrived"
                asgn.arrived_at = now_utc()
                unit.status = "on_scene"
                unit.lat = incident.lat
                unit.lng = incident.lng
                
                if not incident.first_arrival_at:
                    incident.first_arrival_at = now_utc()
            
            # Publish unit update
            asyncio.ensure_future(bus.publish("unit.update", UnitOut.model_validate(unit).model_dump()))
        
        await session.commit()
```

### Scenario Execution

```python
_SCENARIOS = {
    "flood": [
        # Sensor breach
        {"delay": 0, "action": "sensor_breach", "sensor_id": "sensor-fld-001"},
        # Citizen reports
        {"delay": 2, "action": "citizen_report", "text": "paani bhar gaya...", "lat": 22.3102, "lng": 73.188, "radius": 300},
        # ... more events ...
    ],
    "chemical_fire": [...],
    "pileup": [...],
}

async def run_scenario(name: str):
    scenario = _SCENARIOS.get(name)
    if not scenario:
        return
    
    _state["scenario"] = name
    _state["message"] = f"Running {name} scenario..."
    
    for event in scenario:
        await asyncio.sleep(event["delay"])
        
        if event["action"] == "sensor_breach":
            await _breach_sensor(event["sensor_id"])
        elif event["action"] == "citizen_report":
            await _inject_citizen_report(event)
```

---

## 13. Geographic Utilities (`geo.py`)

### Haversine Distance

```python
import math

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points in kilometres."""
    R = 6371.0  # Earth's radius in km
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c
```

### ETA Computation

```python
def eta_minutes(dist_km: float, speed_kmh: float) -> float:
    """Calculate estimated travel time in minutes."""
    if speed_kmh <= 0:
        return float("inf")
    return (dist_km / speed_kmh) * 60.0
```

---

## 14. LLM Client (`core/llm.py`)

See the AI/ML Documentation (`Docs/06_AI_ML_Documentation/`) for full coverage of the LLM client architecture, circuit breaker, and cache. Key interfaces:

```python
async def complete_json(
    prompt: str,
    system: str = "",
    cache_key: str | None = None,
) -> dict | None:
    """
    Returns parsed JSON dict or None on any failure.
    Never raises exceptions.
    Implements: circuit breaker → Groq → Gemini fallback → LRU cache.
    """
```

---

## 15. Event System (`core/events.py`)

### EventBus

```python
class EventBus:
    def __init__(self, connection_manager: ConnectionManager):
        self.manager = connection_manager
        self._subscribers: list[Callable] = []
    
    async def publish(self, event_type: str, payload: dict) -> None:
        envelope = {
            "type": event_type,
            "ts": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        
        # Broadcast to all WebSocket clients
        await self.manager.broadcast(envelope)
        
        # Call in-process subscribers
        for sub in list(self._subscribers):
            result = sub(event_type, payload)
            if asyncio.iscoroutine(result):
                asyncio.create_task(result)

bus = EventBus(manager)  # Module-level singleton
```

### ConnectionManager

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active_connections.append(ws)
    
    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active_connections:
            self.active_connections.remove(ws)
    
    async def broadcast(self, message: dict) -> None:
        text = dumps_json(message)
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()  # Module-level singleton
```

### `dumps_json` Helper

```python
def dumps_json(obj: Any) -> str:
    """JSON serializer that handles datetimes."""
    def default(o):
        if isinstance(o, datetime):
            return o.isoformat()
        raise TypeError(f"Object of type {type(o)} is not JSON serializable")
    return json.dumps(obj, default=default)
```

---

*This document is part of the ResQGrid documentation package. For the data model reference, see `Docs/07_Data_Models/`. For AI-specific documentation, see `Docs/06_AI_ML_Documentation/`.*
