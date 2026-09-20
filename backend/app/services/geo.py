"""ResQGrid — geo utility functions (pure, no I/O)."""
from __future__ import annotations

import math


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return great-circle distance in kilometres between two WGS-84 points.

    Args:
        lat1: Latitude of point 1 (decimal degrees).
        lng1: Longitude of point 1 (decimal degrees).
        lat2: Latitude of point 2 (decimal degrees).
        lng2: Longitude of point 2 (decimal degrees).

    Returns:
        Distance in kilometres (≥ 0).
    """
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def eta_minutes(dist_km: float, speed_kmh: float) -> float:
    """Estimated travel time in minutes.

    Args:
        dist_km: Distance in kilometres.
        speed_kmh: Speed in km/h (must be > 0).

    Returns:
        ETA in minutes. Returns 0.0 if distance is 0 or speed is non-positive.
    """
    if speed_kmh <= 0 or dist_km <= 0:
        return 0.0
    return (dist_km / speed_kmh) * 60.0
