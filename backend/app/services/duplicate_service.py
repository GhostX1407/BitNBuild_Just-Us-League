"""
services/duplicate_service.py
───────────────────────────────
Service for detecting duplicate emergency incidents.
"""

import math
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident
from app.schemas.incident import IncidentCreate

# Configurable values
RADIUS_METERS = 500
TIME_WINDOW_MINUTES = 30
SIMILARITY_THRESHOLD = 0.4  # For text similarity


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in meters between two points on the earth."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2) + \
        (math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


async def detect_duplicate(db: AsyncSession, new_incident: IncidentCreate) -> Optional[Incident]:
    """
    Detect if there is an existing active incident that matches the new report.
    Returns the duplicate Incident if found, else None.
    """
    # 1. Fetch recent incidents (within 30 mins) that are NOT resolved
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=TIME_WINDOW_MINUTES)
    
    query = select(Incident).where(
        Incident.created_at >= cutoff_time,
        Incident.status != "Resolved"
    )
    result = await db.execute(query)
    recent_incidents = result.scalars().all()
    
    best_match: Optional[Incident] = None
    highest_similarity = 0.0
    
    for existing in recent_incidents:
        # Check category first
        if existing.category != new_incident.category:
            continue
            
        # Check distance
        dist = haversine_distance(
            float(new_incident.latitude),
            float(new_incident.longitude),
            float(existing.latitude),
            float(existing.longitude)
        )
        if dist > RADIUS_METERS:
            continue
            
        # Check text similarity
        existing_desc = existing.description.lower() if existing.description else ""
        new_desc = new_incident.description.lower() if new_incident.description else ""
        
        if not existing_desc or not new_desc:
            continue
            
        similarity = SequenceMatcher(None, existing_desc, new_desc).ratio()
        
        if similarity >= SIMILARITY_THRESHOLD and similarity > highest_similarity:
            highest_similarity = similarity
            best_match = existing
            
    return best_match
