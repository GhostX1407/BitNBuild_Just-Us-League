# ResQGrid — Intelligent Emergency Response & Resource Coordination Platform

ResQGrid is a unified emergency management platform that aggregates multi-source incident reports (citizen web forms, emergency call transcripts, IoT sensor feeds, field units, and hospitals), performs automatic classification and duplicate detection, generates explainable resource recommendations, and tracks real-time response operations with SLA monitoring and live escalation.

---

## 📖 Documentation
- [System Overview](file:///docs/SYSTEM_OVERVIEW.md): Problem context, design principles, and architecture decisions.
- [Product Requirements Document (PRD)](file:///docs/01_PRD.md): Detailed personas, functional requirements (F1–F10), and scope tiers.
- [Architecture & Tech Stack](file:///docs/02_ARCHITECTURE.md): System architecture, pipeline flow, and technical specifications.
- [Data Model & API Contract](file:///docs/03_DATA_API.md): Database schemas, REST endpoints, and WebSocket event payloads.

---

## 🚀 Key Capabilities
- **Multi-Source Ingestion**: Ingests reports from citizens, emergency calls, IoT sensors, field responders, and medical facilities.
- **Intelligent Triage & Deduplication**: Fast classification (LLM + scikit-learn fallback) with automated geospatial and textual duplicate-merging.
- **Explainable Resource Matching**: Multi-factor scoring (proximity, capability fit, unit readiness, and load balance) with complete score breakdowns.
- **Real-Time Monitoring & WebSockets**: Live operational map, active incident queues, unit status tracking, and instant event streaming.
- **Automated SLA & Escalation Ladder**: Proactive alerts for response delays, critical P1 incidents, and multi-tier escalation (L0 to L3).
- **Interactive Simulator**: Built-in scenario injection (flood, chemical fire, highway pile-up) and unit movement simulation for demonstration.

---

## 🛠️ Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Running Tests
```bash
cd backend
pytest tests/
```
