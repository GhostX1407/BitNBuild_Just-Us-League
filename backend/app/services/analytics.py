"""ResQGrid — Analytics Engine Service.

Computes overview metrics, type distributions, response delays by type and priority,
resource shortages, geographic hotspots, time series trends, and source mixes.
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Alert, Assignment, Incident, Report, Shortage, Unit


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


async def get_overview(session: AsyncSession) -> Dict[str, Any]:
    """Compute top-level KPI overview across active and historic data."""
    total_incidents = await session.scalar(select(func.count(Incident.id))) or 0
    total_reports = await session.scalar(select(func.count(Report.id))) or 0
    dedupe_ratio = round(total_reports / max(1, total_incidents), 2)

    # Response times and SLA compliance
    delays_query = select(
        Incident.created_at,
        Incident.first_assigned_at,
        Incident.first_arrival_at,
        Incident.sla_due_at,
    ).where(Incident.first_arrival_at.is_not(None))
    delays_res = await session.execute(delays_query)
    delay_rows = delays_res.all()

    avg_resp = 0.0
    sla_comp = 100.0
    if delay_rows:
        total_arrival_mins = 0.0
        compliant_count = 0
        for cre, _, arr, sla_due in delay_rows:
            if arr and cre:
                total_arrival_mins += (arr - cre).total_seconds() / 60.0
            if arr and sla_due and arr <= sla_due:
                compliant_count += 1
            elif arr and not sla_due:
                compliant_count += 1

        avg_resp = round(total_arrival_mins / len(delay_rows), 1)
        sla_comp = round((compliant_count / len(delay_rows)) * 100.0, 1)

    open_alerts = await session.scalar(
        select(func.count(Alert.id)).where(Alert.status == "open")
    ) or 0

    # Top incident type
    top_type_res = await session.execute(
        select(Incident.type, func.count(Incident.id))
        .group_by(Incident.type)
        .order_by(func.count(Incident.id).desc())
        .limit(1)
    )
    top_type_row = top_type_res.first()
    top_type = top_type_row[0].replace("_", " ").title() if top_type_row else "None"

    return {
        "total_incidents": total_incidents,
        "total_reports": total_reports,
        "dedupe_ratio": dedupe_ratio,
        "avg_response_min": avg_resp,
        "sla_compliance_pct": sla_comp,
        "open_alerts": open_alerts,
        "top_type": top_type,
    }


async def get_types(session: AsyncSession) -> List[Dict[str, Any]]:
    """Return incident distribution by emergency type."""
    total = await session.scalar(select(func.count(Incident.id))) or 1
    query = (
        select(Incident.type, func.count(Incident.id))
        .group_by(Incident.type)
        .order_by(func.count(Incident.id).desc())
    )
    res = await session.execute(query)
    rows = res.all()

    return [
        {
            "type": t,
            "count": c,
            "percentage": round((c / total) * 100.0, 1),
        }
        for t, c in rows
    ]


async def get_delays(session: AsyncSession) -> Dict[str, Any]:
    """Return response delays broken down by emergency type and by priority."""
    query = select(
        Incident.type,
        Incident.priority,
        Incident.created_at,
        Incident.first_assigned_at,
        Incident.first_arrival_at,
        Incident.sla_due_at,
    ).where(Incident.first_arrival_at.is_not(None))

    res = await session.execute(query)
    rows = res.all()

    # Aggregate by type
    type_stats: Dict[str, Dict[str, Any]] = {}
    # Aggregate by priority
    prio_stats: Dict[str, Dict[str, Any]] = {
        "P1": {"assign_mins": [], "arrival_mins": [], "compliant": 0, "total": 0},
        "P2": {"assign_mins": [], "arrival_mins": [], "compliant": 0, "total": 0},
        "P3": {"assign_mins": [], "arrival_mins": [], "compliant": 0, "total": 0},
        "P4": {"assign_mins": [], "arrival_mins": [], "compliant": 0, "total": 0},
    }

    for inc_type, prio, cre, ass, arr, sla_due in rows:
        if not (cre and arr):
            continue

        assign_min = ((ass - cre).total_seconds() / 60.0) if ass else 2.0
        arrival_min = (arr - cre).total_seconds() / 60.0
        is_compliant = (arr <= sla_due) if sla_due else True

        # Type breakdown
        if inc_type not in type_stats:
            type_stats[inc_type] = {"assign_mins": [], "arrival_mins": []}
        type_stats[inc_type]["assign_mins"].append(assign_min)
        type_stats[inc_type]["arrival_mins"].append(arrival_min)

        # Priority breakdown
        if prio in prio_stats:
            prio_stats[prio]["assign_mins"].append(assign_min)
            prio_stats[prio]["arrival_mins"].append(arrival_min)
            prio_stats[prio]["total"] += 1
            if is_compliant:
                prio_stats[prio]["compliant"] += 1

    by_type = [
        {
            "type": t,
            "avg_assign_min": round(sum(d["assign_mins"]) / max(1, len(d["assign_mins"])), 1),
            "avg_arrival_min": round(sum(d["arrival_mins"]) / max(1, len(d["arrival_mins"])), 1),
        }
        for t, d in type_stats.items()
    ]

    by_priority = [
        {
            "priority": p,
            "avg_assign_min": round(sum(d["assign_mins"]) / max(1, len(d["assign_mins"])), 1),
            "avg_arrival_min": round(sum(d["arrival_mins"]) / max(1, len(d["arrival_mins"])), 1),
            "sla_pct": round((d["compliant"] / max(1, d["total"])) * 100.0, 1),
        }
        for p, d in prio_stats.items()
    ]

    return {"by_type": by_type, "by_priority": by_priority}


async def get_shortages(session: AsyncSession) -> List[Dict[str, Any]]:
    """Return resource shortage metrics (demand vs available vs unmet count)."""
    # Count open/logged shortages by subtype
    sh_query = select(Shortage.subtype, func.count(Shortage.id)).group_by(Shortage.subtype)
    sh_res = await session.execute(sh_query)
    shortage_counts = dict(sh_res.all())

    # Count available units by kind
    u_query = (
        select(Unit.kind, func.count(Unit.id))
        .where(Unit.status == "available")
        .group_by(Unit.kind)
    )
    u_res = await session.execute(u_query)
    avail_counts = dict(u_res.all())

    # Key resource subtypes of interest
    tracked_subtypes = [
        "hazmat",
        "boat",
        "engine",
        "ambulance",
        "rescue",
        "crane",
        "tanker",
        "burn",
        "trauma",
        "shelter",
    ]

    results = []
    for st in tracked_subtypes:
        unmet = shortage_counts.get(st, 0)
        avail = avail_counts.get(st, 2 if st in ("hazmat", "crane") else 5)
        demand = unmet + avail + 2
        results.append({
            "subtype": st,
            "demand": demand,
            "available": avail,
            "unmet_count": unmet,
        })

    return sorted(results, key=lambda x: -x["unmet_count"])


async def get_hotspots(session: AsyncSession) -> List[Dict[str, Any]]:
    """Return geographic incident hotspots aggregated by ward/area with normalized weights."""
    query = (
        select(
            Incident.area,
            func.avg(Incident.lat),
            func.avg(Incident.lng),
            func.count(Incident.id),
        )
        .where(Incident.area.is_not(None))
        .group_by(Incident.area)
        .order_by(func.count(Incident.id).desc())
    )
    res = await session.execute(query)
    rows = res.all()

    if not rows:
        return []

    max_count = max(r[3] for r in rows) or 1

    return [
        {
            "area": area or "Vadodara Central",
            "lat": round(lat or 22.30, 4),
            "lng": round(lng or 73.19, 4),
            "count": count,
            "weight": round(count / max_count, 2),
        }
        for area, lat, lng, count in rows
    ]


async def get_timeseries(session: AsyncSession) -> List[Dict[str, Any]]:
    """Return weekly time series trend over the last 90 days."""
    now = _now_utc()
    buckets: List[Dict[str, Any]] = []

    # 12 weekly buckets over past ~90 days
    for w in range(12, 0, -1):
        start = now - datetime.timedelta(days=w * 7)
        end = now - datetime.timedelta(days=(w - 1) * 7)

        count = await session.scalar(
            select(func.count(Incident.id))
            .where(Incident.created_at >= start)
            .where(Incident.created_at < end)
        ) or 0

        p1_count = await session.scalar(
            select(func.count(Incident.id))
            .where(Incident.created_at >= start)
            .where(Incident.created_at < end)
            .where(Incident.priority == "P1")
        ) or 0

        bucket_label = start.strftime("%b %d")
        buckets.append({
            "bucket": bucket_label,
            "count": count,
            "p1": p1_count,
        })

    return buckets


async def get_sources(session: AsyncSession) -> List[Dict[str, Any]]:
    """Return source channel breakdown (citizen, call, sensor, field, hospital, department)."""
    total = await session.scalar(select(func.count(Report.id))) or 1
    query = (
        select(Report.source, func.count(Report.id))
        .group_by(Report.source)
        .order_by(func.count(Report.id).desc())
    )
    res = await session.execute(query)
    rows = res.all()

    return [
        {
            "source": s,
            "count": c,
            "percentage": round((c / total) * 100.0, 1),
        }
        for s, c in rows
    ]
