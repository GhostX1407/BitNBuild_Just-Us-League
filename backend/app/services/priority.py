"""ResQGrid — Priority computation service (deterministic).

Priority table:
    P1 (critical, 2 min SLA)  — sev 5, or sev 4 with life risk / hazmat / trapped
    P2 (high,     5 min SLA)  — sev 4 (without P1 trigger)
    P3 (medium,  10 min SLA)  — sev 3
    P4 (low,     20 min SLA)  — sev ≤ 2

Corroboration bump: ≥3 reports OR ≥2 distinct sources → raise one level.
Cannot bump above P1.
"""
from __future__ import annotations

from typing import List, Tuple

# SLA base minutes (unscaled); multiply by settings.SLA_TIME_SCALE at call site
SLA_BASE: dict[str, int] = {"P1": 2, "P2": 5, "P3": 10, "P4": 20}

# Hazards / cues that indicate life risk
_LIFE_CUES = {
    "trapped", "unconscious", "injured", "fatal", "fatalities",
    "not breathing", "children", "child", "stranded",
}
_HAZMAT_HAZARDS = {
    "chemical", "explosion", "toxic", "collapse", "fire_spreading",
    "gas_leak", "chlorine", "ammonia", "acid",
}


def _is_life_risk(people_affected: int, hazards: List[str]) -> bool:
    """Return True if situation poses immediate life risk."""
    if people_affected >= 1 and any(c in h.lower() for c in _LIFE_CUES for h in hazards):
        return True
    return any(h.lower() in _HAZMAT_HAZARDS for h in hazards)


def compute_priority(
    severity: int,
    people_affected: int,
    hazards: List[str],
    report_count: int,
    sources: List[str],
) -> Tuple[str, int]:
    """Compute incident priority and unscaled SLA minutes.

    | Severity | Life risk? | Priority |
    |----------|-----------|----------|
    | 5        | any        | P1       |
    | 4        | yes        | P1       |
    | 4        | no         | P2       |
    | 3        | any        | P3       |
    | ≤2       | any        | P4       |

    Corroboration bump: ≥3 reports OR ≥2 distinct source types → raise one level.

    Args:
        severity: 1–5 (5 = most severe).
        people_affected: Number of people affected (0 = unknown).
        hazards: List of hazard strings from classification.
        report_count: Total number of reports for the incident.
        sources: List of distinct source names.

    Returns:
        Tuple of (priority_str, unscaled_sla_minutes).
    """
    sev = max(1, min(5, severity))
    life = _is_life_risk(people_affected, hazards)

    if sev == 5:
        priority = "P1"
    elif sev == 4 and life:
        priority = "P1"
    elif sev == 4:
        priority = "P2"
    elif sev == 3:
        priority = "P3"
    else:
        priority = "P4"

    # Corroboration bump
    distinct_sources = len(set(sources))
    if report_count >= 3 or distinct_sources >= 2:
        _ORDER = ["P4", "P3", "P2", "P1"]
        idx = _ORDER.index(priority)
        if idx < len(_ORDER) - 1:
            priority = _ORDER[idx + 1]

    return priority, SLA_BASE[priority]
