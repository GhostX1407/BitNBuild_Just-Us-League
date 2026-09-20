# ResQGrid — Frontend Build Prompt (Command-Console UI, No Backend)

Paste this whole document into your AI coding tool (Claude Code, Cursor, v0, etc.) as the brief. It is self-contained.

---

## 0. What you are building

**ResQGrid** is an intelligent emergency-response and resource-coordination platform for a hackathon demo, set in **Vadodara, Gujarat** (lat 22.30, lng 73.19). Multi-source incident reports (citizen, emergency call, sensor, field team, hospital, department) get triaged, merged, matched to resources, tracked live, and escalated on SLA breach.

**Build the FRONTEND ONLY.**
- No backend, no server, no real database, no Docker.
- React 18 + Vite + TypeScript + Tailwind + Zustand + React-Leaflet + Recharts + Framer Motion.
- All data comes from a local **mock layer**: static JSON fixtures + an in-memory fake WebSocket/event emitter that plays scripted scenarios (see §7). Structure this mock layer so a real backend could later be swapped in with minimal changes (same types, same store actions, same event shape) — but do not build that backend.
- Routes to build: `/console` (dispatcher — primary), `/analytics`, `/report` (citizen), `/team/:unitId` (field, mobile-first), `/track/:id` (citizen tracking, public), `/hospital/:id` (light view), `/simulator` (demo control). `/console` is where you should spend most of your effort.

Do not reproduce this brief's structure as literal UI copy (no section headers like "F1 Incident Collection" in the product). Translate function into interface.

---

## 1. Design mandate — read this before choosing anything

Design this like the lead designer at a studio that never lets two clients end up with the same-looking product. This brief has already rejected the generic AI-generated defaults. Specifically avoid, unless you have a reason tied to this subject:

- Warm cream background + serif display + terracotta/clay accent.
- Near-black background with one bright neon accent and nothing else considered.
- Rounded "SaaS card kit": identical rounded-corner cards, one border-radius on everything, the same soft grey drop-shadow under each, gradient-wash decoration.
- Tracked-out ALL-CAPS eyebrow labels above every heading, middle-dot separated meta strings, em-dash "WORD — fragment" labels, a '→' tacked onto every button/link.
- Fade-and-slide-up entrance on every section, hover-lift on every card. Motion that isn't earned.

Instead, **ground the design in what this product actually is**: a live operations console people stare at for hours during a disaster, where a wrong read costs time and misreading severity costs lives. Think mission control / air-traffic-control / seismograph / radar console — not a marketing site, not a generic admin template. The map and the incident queue are the hero, not a big headline. Legibility, scan-speed, and state-clarity beat decoration every time. A dispatcher should be able to tell "is anything P1 right now" in under one second, from across the room.

Work in two passes yourself as you build:
1. **Plan** — commit to the token system below (or your own refinement of it), and a layout concept, before writing code.
2. **Critique** — before finishing, check: does any part of this look like the generic default for "dashboard app"? If yes, redo that part and note what changed.

---

## 2. Design language — "Night Ops" console

### 2.1 Color system (name them, use as CSS variables / Tailwind theme, not ad hoc hex)

| Token | Hex | Use |
|---|---|---|
| `--void` | `#0A0E16` | App background — the "dark room" the console sits in |
| `--console` | `#111826` | Panel/surface background (map frame, cards, drawers) |
| `--console-raised` | `#182233` | Elevated surface (modals, active/selected rows) |
| `--hairline` | `#232E40` | Borders, dividers — thin, not shadows |
| `--paper` | `#E7ECF3` | Primary text |
| `--slate` | `#8C99AD` | Secondary text, labels, timestamps |
| `--slate-dim` | `#5B6579` | Tertiary/disabled text |
| `--signal-amber` | `#FF9E2C` | Brand/primary accent — active states, P2/P3, focus rings, the "pulse" |
| `--alert-red` | `#FF4747` | P1 / critical severity / SLA breach — used sparingly, reserved for real danger |
| `--response-teal` | `#17D6B2` | Resolved, available, success, "on scene" |
| `--caution-gold` | `#F2C230` | Warnings, delayed but not breached, shortages |
| `--recon-blue` | `#4FA6FF` | Informational, field-team layer, non-urgent sensor data |

Severity/priority color mapping (used consistently everywhere: map pins, queue rows, badges, charts): P1 → `--alert-red`, P2 → `--signal-amber`, P3 → `--caution-gold`, P4 → `--recon-blue`. Never use red for anything that isn't actually P1/critical — its rarity is what makes it readable at a glance.

Background is never pure black; surfaces are never pure white. No drop-shadows for elevation — use the hairline border + a one-step lighter fill (`--console` → `--console-raised`) to show elevation, like panels on a physical console.

### 2.2 Typography

Two families, clearly distinct roles, plus a monospace that is functionally justified here (not decorative) because the product is genuinely data-dense — coordinates, timestamps, incident codes, countdowns:

- **Display / UI headings**: a geometric, slightly technical sans — e.g. **Space Grotesk** or **General Sans**. Used for page titles, incident type labels, big KPI numbers. Set tight tracking, medium-bold weights, never italic.
- **Body / UI text**: a humanist sans built for small sizes and long reading at low light — e.g. **Inter** or **IBM Plex Sans**. Used for descriptions, form fields, paragraph content in drawers.
- **Telemetry / data mono**: **IBM Plex Mono** or **JetBrains Mono**. Reserved for: incident codes (`INC-0142`), lat/lng, timestamps, SLA countdown digits, unit IDs, score numbers. This is a functional choice (fixed-width digits don't jitter as a countdown ticks) — do not spread it to labels or buttons.

No tracked-out all-caps eyebrows. Section labels are sentence case, small, in `--slate`, doing an actual job (e.g. "6 active" next to "Incidents" — a count, not decoration).

### 2.3 Shape, spacing, iconography

- Small, consistent radius (4–6px) on interactive controls only (buttons, inputs, chips). Panels and map frame are **square-cornered or 2px max** — a console has edges, not bubbles.
- Grid-driven spacing scale (4/8/12/16/24/32/48). Dense but not cramped — this is a professional tool used all day, not a landing page.
- Icons: one consistent line-icon set (e.g. Lucide, already in the stack) at a fixed stroke width. Severity/type icons should be legible at 14px on a map pin.
- A subtle **fixed pixel grid / scanline texture** (very low opacity, ~2–3%) on the void background is a legitimate, on-brand touch here — evokes a radar/ops-room screen. Keep it near-invisible; it should never compete with content.

### 2.4 Layout concept (ASCII)

`/console` — not a centered marketing layout, a video-wall console:

```
┌──┬──────────────────────────────────────────┬────────────┐
│  │  KPI STRIP (ticker-style, thin, always on)│            │
│N ├──────────────────────────────────────────┤  INCIDENT  │
│A │                                          │  QUEUE     │
│V │            LIVE MAP (hero)              │  (sorted:  │
│  │   incidents pulse · units move ·        │  priority  │
│R │   heat layer toggle · sensor layer      │  + age)    │
│A │                                          │            │
│I │                                          ├────────────┤
│L │                                          │  ALERTS    │
│  │                                          │  FEED      │
└──┴──────────────────────────────────────────┴────────────┘
        Incident detail opens as a right-side drawer OVER the queue,
        not a new page — keeps map always visible.
```

Left rail: thin icon rail, role switcher (Dispatcher/Field/Public — per PRD's simple role concept, no real auth), connection status dot. Right column: incident queue (top) + alerts feed (bottom), both scrollable independently, map never scrolls away. This asymmetry (map dominant, not a 3-equal-column grid) is the deliberate choice — protect it.

`/team/:unitId` is mobile-first and radically simpler: one assignment card, a big "arrived / status" stepper, a mini-map, nothing else — a field responder is not staring at a dashboard.

`/report` (citizen) is calm and reassuring, not console-styled — different emotional register for a scared citizen filing a report: more whitespace, warmer micro-copy, a visible "what happens next."

---

## 3. Motion system — 90fps-smooth, but disciplined

Performance rules (non-negotiable):
- Animate only `transform` and `opacity`. Never animate `top/left/width/height/box-shadow` directly.
- Framer Motion for orchestrated/gesture-driven motion; CSS transitions for simple hover/focus states.
- Respect `prefers-reduced-motion`: disable ambient/looping motion, keep only functional state changes, no ripples/pulses.
- Everything targets a steady 90–120Hz feel: durations mostly 120–240ms for UI feedback, spring-based (not linear) easing for anything that feels physical (drawers, cards), no motion longer than ~600ms except the one boot sequence below.

**One orchestrated moment (spend your "boldness budget" here):** a brief system-boot sequence on first load of `/console` — panels/hairlines draw themselves in (like an ops console powering up), KPI numbers count up from zero once, map tiles fade in, then it's live. Runs once, ~800ms–1.2s total, skippable, never repeats on navigation.

**Motion that answers an action (the rest of the app):**
- New report arrives → a ripple/pulse expands once from its map coordinate + the queue row slides in from the top with a brief highlight flash that fades — shows *what just changed*, not decoration.
- Incident merges into another → the duplicate's card visually "collapses into" the parent card (scale + move + fade), reinforcing that two became one.
- Severity escalates → the priority badge and map pin morph color with a short flash, not a full re-render.
- SLA countdown → a radial ring depletes in real time; color shifts amber → red as it nears breach; breach triggers one sharp pulse, not a looping alarm.
- Status stepper (new → triaged → dispatched → en route → on scene → resolved) → the fill line animates between steps on change only.
- Drawer open/close → slides in from the right with a slight spring, map stays interactive underneath (dim it 10–15%, don't block it).
- WebSocket disconnect/reconnect → a thin banner slides down from the top edge of the console, not a modal.
- Unit movement on the map (simulator) → smooth interpolated position updates (tween between ticks), not teleporting jumps.

Do **not** add: hover-lift + shadow on every card, staggered fade-up on every list mount, spinning loaders where a skeleton would do, confetti/celebration effects. If a motion doesn't communicate a state change, cut it.

---

## 4. Key screens & component specs

### `/console` (primary — build this first and best)
- **KPI strip**: active incidents, P1 count, avg response time, units available, unmet requirements. Numbers in mono, tiny trend arrows, ticker-like horizontal strip, always visible, never a full-width hero banner.
- **Map** (React-Leaflet, OSM tiles, dark-matched custom tile filter or a CSS filter over standard tiles to match the console palette): incident markers colored/pulsing by severity, unit markers with status color + directional heading, facility layer (hospitals/stations) as a distinct fixed icon set, sensor layer, heat-map toggle, linked-report lines connecting merged reports to their incident, assigned-unit route lines (straight or simple polyline). Map controls (layer toggles) live as a compact floating control cluster, bottom-left, console-styled (not default Leaflet gray buttons).
- **Incident queue**: sorted priority+age, each row shows priority badge, type icon, short title, source icons (which channels reported it), report count, age, a mini SLA ring. Filters as compact chips above the list (type/severity/status/source), not a separate filter panel.
- **Incident detail drawer**: summary (AI-generated label shown explicitly when relevant), timeline, linked reports (evidence panel), recommended vs. assigned resources with **visible score breakdown** (proximity/capability/readiness/load — a small horizontal stacked bar or radar-style mini chart per candidate, this is your explainability moment and a real differentiator, make it good), status stepper, SLA countdown ring, notification log, one-click "Approve all" and per-unit assign/override.
- **Alerts feed**: critical/delayed/escalation/sensor/duplicate-cluster, each with level (L0–L3) shown as a small escalation-ladder indicator, ack/resolve actions inline.
- **Simulator access**: a compact control tucked into the console (not a separate loud page) to trigger scenarios for the demo — start/stop feed, run scenario, inject breach, fast-forward SLA, reset.

### `/analytics`
Charts (Recharts, restyled to match tokens — no default Recharts blue/green): incident types (donut), incidents over time, severity mix, response delays by type/priority with SLA compliance %, resource shortages (demand vs. available), affected-area heatmap/top-N table, source mix, duplicate-reduction stat (reports vs. incidents — make this number prominent, it's the product's core value claim), unit utilization. One short AI-insight line per chart, visually distinct from the chart itself (e.g., a thin annotated strip, not a chat bubble).

### `/report` (citizen)
Simple form: text/photo-URL/GPS-or-map-pick/phone. Calm, reassuring tone, clear confirmation with a tracking ID at the end. Different visual register from the console (see §2.4).

### `/team/:unitId`
Mobile-first. One assignment, a big status stepper, mini-map, contact/notes. Large touch targets.

### `/track/:id`
Public, sanitized, minimal — status only, no sensitive operational detail.

### `/hospital/:id`
Light view: incoming-patient alerts, capacity/beds input.

---

## 5. Interaction details worth getting right

- Priority/severity badges: consistent shape and color everywhere (map, queue, drawer, charts) — this consistency is what lets a dispatcher pattern-match instantly.
- Empty states are instructional, not decorative: e.g., an idle map before the ambient feed starts should say what's about to happen, not just look blank.
- Errors/failures speak in the interface's voice, are specific about what happened, never apologize, always say what to do next (e.g., a failed notification in the outbox shows why and offers retry, not a vague "something went wrong").
- Buttons name the action exactly and keep that name through the flow: "Approve all" triggers a toast that says "Approved" — not generic "Success."
- Keyboard focus must be visibly styled (amber focus ring), tab order must follow the console's logical scan order (map → queue → drawer).

---

## 6. Tech stack & structure (frontend only)

```
frontend/
  src/
    app/{routes,App}.tsx
    pages/{Console,Analytics,Report,Team,Track,Hospital,Simulator}/
    components/
      map/        (MapView, IncidentMarker, UnitMarker, FacilityLayer, HeatLayer, RouteLine)
      incident/    (QueueRow, DetailDrawer, StatusStepper, ScoreBreakdown, SLARing, Timeline)
      alerts/      (AlertCard, EscalationLadder)
      charts/      (donuts/bars/heatmap wrappers over Recharts, themed)
      ui/          (Button, Badge, Card, Toast, Drawer, ConnectionBanner, RoleSwitcher, Chip)
    store/         (incidents.ts, units.ts, alerts.ts, ws.ts — Zustand)
    mocks/         (fixtures.ts — static seed JSON matching the schemas below; fakeWs.ts — scripted event emitter/simulator engine; scenarios.ts — flood/chemical-fire/pileup scripts from §7)
    services/      (mockApi.ts — promise-based functions standing in for the real REST calls, same signatures a real api.ts would have)
    types/domain.ts (Report, Incident, Unit, Facility, Assignment, Shortage, Alert, Notification, Sensor — mirror the real data model below so a backend swap later is painless)
    styles/tokens.css (the CSS variables from §2.1/2.2)
```

Use Zustand stores that apply incoming mock-WS events the same way they'd apply real ones (`incident.upsert`, `report.new`, `unit.update`, `alert.new|ack|resolved`, `notification.new`, `sim.state`, `kpi.update`) — this event vocabulary is defined in the real architecture, keep it even though the transport is fake.

## 7. Mock data & fake realtime (since there is no backend)

- Seed static fixtures in `mocks/fixtures.ts`: a handful of hospitals/fire stations/units/facilities/sensors around Vadodara (22.30, 73.19), plus a small set of already-active incidents so screens aren't empty on load.
- Build `mocks/fakeWs.ts`: an in-memory event emitter with a `play(scenario)` API that pushes a scripted sequence of events on a timer (e.g., a flood scenario: gauge breach → several citizen reports cluster and auto-merge → P1 alert → recommended units appear with scores → approve → a unit "moves" along an interpolated path → a delay → delayed-response alert → escalation). This powers `/simulator` and makes `/console` feel alive without any server.
- Match the shapes in the real data model so this is a drop-in-replaceable layer, not throwaway: `Report {id, source, text, lat, lng, location_text, reliability, created_at, incident_id, classification}`; `Incident {id, code, type, title, severity, priority, confidence, status, escalated, escalation_level, lat, lng, report_count, decision_log[], sla_due_at, track_id}`; `Unit {id, name, kind, category, capabilities[], status, lat, lng, speed_kmh, fatigue}`; `Facility {id, name, kind, lat, lng, capabilities[], beds_total, beds_free}`; `Assignment {id, incident_id, unit_id, score, score_breakdown, eta_min, status}`; `Alert {id, incident_id, kind, rule, level, message, status}`.
- Do not call any real network endpoint. Everything resolves from local mock functions with small artificial delays (to keep loading states honest).

---

## 8. Accessibility & responsiveness floor

- `/console` is desktop-first (this is a professional multi-monitor tool) but must not break down to a laptop screen (≥1280px baseline).
- `/report` and `/team/:unitId` are mobile-first.
- Color is never the only signal — pair severity color with an icon/shape and a text label.
- Contrast meets WCAG AA against the dark palette above (check `--slate` on `--console` especially).
- Visible focus states everywhere, reduced-motion respected as described in §3.

---

## 9. Explicit boundaries

- Frontend only. No backend, no real API, no database, no auth, no Docker.
- Use the mock layer in §7 for all data and "realtime" behavior.
- Keep the component/type contracts close to the real architecture and data model described above so a real backend can be wired in later by swapping `services/mockApi.ts` and `mocks/fakeWs.ts` only.
- Do not add features beyond what's described here without flagging them first.
