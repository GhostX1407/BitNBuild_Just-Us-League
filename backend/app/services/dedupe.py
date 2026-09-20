"""ResQGrid — Deduplification service.

Scores each active incident against a new report using:
    0.40 · geo_score     (proximity, radius 500 m / 1 km for flood)
    0.35 · text_score    (TF-IDF cosine similarity)
    0.15 · type_score    (type compatibility)
    0.10 · time_score    (linear decay over 60 min)

Thresholds:
    score ≥ MERGE_T  (0.65) → merge
    score ∈ [RELATED_T, MERGE_T) (0.45–0.65) → related
    score < RELATED_T  → new
"""
from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Thresholds (module-level constants for easy unit testing)
MERGE_T = 0.65
RELATED_T = 0.45

# Radius by incident type (km)
_FLOOD_RADIUS_KM = 1.0
_DEFAULT_RADIUS_KM = 0.5

# Related type pairs (symmetric)
_RELATED_PAIRS = {
    frozenset({"fire", "industrial_hazard"}),
    frozenset({"fire", "gas_leak"}),
    frozenset({"industrial_hazard", "gas_leak"}),
    frozenset({"road_accident", "medical"}),
}


def _type_score(t1: str, t2: str) -> float:
    if t1 == t2:
        return 1.0
    if frozenset({t1, t2}) in _RELATED_PAIRS:
        return 0.5
    return 0.0


def _geo_score(
    inc_lat: Optional[float],
    inc_lng: Optional[float],
    rep_lat: Optional[float],
    rep_lng: Optional[float],
    inc_type: str,
    location_uncertain: bool,
) -> float:
    if inc_lat is None or inc_lng is None or rep_lat is None or rep_lng is None:
        return 0.3  # neutral when no location
    from app.services.geo import haversine_km
    d = haversine_km(inc_lat, inc_lng, rep_lat, rep_lng)
    radius = _FLOOD_RADIUS_KM if inc_type == "flood" else _DEFAULT_RADIUS_KM
    score = max(0.0, 1.0 - d / radius)
    if location_uncertain:
        score *= 0.5  # cap contribution for uncertain locations
    return score


def _text_score(inc_texts: List[str], rep_text: str) -> float:
    """TF-IDF cosine similarity between new report and incident corpus."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer

        corpus = inc_texts + [rep_text]
        # Guard against empty vocabulary
        non_empty = [t for t in corpus if t and t.strip()]
        if len(non_empty) < 2:
            return 0.0

        vec = TfidfVectorizer(ngram_range=(1, 2), max_features=500)
        mat = vec.fit_transform(non_empty)
        # Cosine similarity between last doc (new report) and centroid of others
        from sklearn.metrics.pairwise import cosine_similarity
        rep_vec = mat[-1]
        inc_vecs = mat[:-1]
        if inc_vecs.shape[0] == 0:
            return 0.0
        sims = cosine_similarity(rep_vec, inc_vecs)
        return float(sims.max())
    except Exception:
        return 0.0


def _time_score(incident_created_at: datetime.datetime) -> float:
    """Linear decay from 1.0 at t=0 to 0.0 at t=60 min."""
    now = datetime.datetime.now(datetime.timezone.utc)
    if incident_created_at.tzinfo is None:
        incident_created_at = incident_created_at.replace(tzinfo=datetime.timezone.utc)
    age_min = (now - incident_created_at).total_seconds() / 60.0
    return max(0.0, 1.0 - age_min / 60.0)


async def find_candidates(
    session: Any,
    report: Dict[str, Any],
    classification: Dict[str, Any],
) -> List[Tuple[Any, float]]:
    """Find active incidents that might match this report.

    Args:
        session: AsyncSession.
        report: Normalised report dict with keys lat, lng, text, source.
        classification: Classification result dict.

    Returns:
        List of (Incident, score) tuples sorted by score descending,
        where score ≥ RELATED_T.
    """
    from sqlalchemy import select
    from app.db.models import Incident, Report as ReportModel

    rep_lat: Optional[float] = report.get("lat")
    rep_lng: Optional[float] = report.get("lng")
    rep_text: str = report.get("text") or ""
    rep_type: str = classification.get("type", "other")
    location_uncertain: bool = report.get("location_uncertain", False)

    # Fetch active, non-historic incidents created within 60 min
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=60)
    stmt = (
        select(Incident)
        .where(Incident.is_historic == False)  # noqa: E712
        .where(Incident.status.not_in(["resolved", "closed"]))
        .where(Incident.created_at >= cutoff)
    )
    result = await session.execute(stmt)
    candidates = result.scalars().all()

    if not candidates:
        return []

    # For each candidate, fetch linked report texts
    scored: List[Tuple[Any, float]] = []
    for incident in candidates:
        # Gather text corpus for this incident
        rep_stmt = select(ReportModel).where(ReportModel.incident_id == incident.id)
        rep_result = await session.execute(rep_stmt)
        linked_reports = rep_result.scalars().all()
        inc_texts = [r.text or "" for r in linked_reports if r.text]
        if incident.summary:
            inc_texts.append(incident.summary)

        geo = _geo_score(
            incident.lat, incident.lng,
            rep_lat, rep_lng,
            incident.type,
            location_uncertain,
        )
        text = _text_score(inc_texts, rep_text)
        typ = _type_score(incident.type, rep_type)
        time = _time_score(incident.created_at)

        score = 0.40 * geo + 0.35 * text + 0.15 * typ + 0.10 * time

        if score >= RELATED_T:
            scored.append((incident, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored
