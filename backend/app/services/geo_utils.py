"""
services/geo_utils.py
──────────────────────
Geographic utility functions.

Phase 1: Haversine formula for straight-line distance between two lat/lon
         points.  Used to prepare for Phase 2 duplicate detection.

Phase 2 migration path:
  1. Add PostGIS extension: `CREATE EXTENSION postgis;`
  2. Add a `location` geometry column to the incidents table.
  3. Replace `haversine_distance` calls in `incident_service.py` with
     PostGIS `ST_DWithin` / `ST_Distance` SQL expressions via GeoAlchemy2.
  4. The function signature here stays the same — callers don't change.

Nothing in this module imports SQLAlchemy — it is purely computational so
it can be unit-tested without a database.
"""

from __future__ import annotations

import math


# Earth's mean radius in kilometers (WGS-84 approximation)
_EARTH_RADIUS_KM = 6371.0


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the great-circle distance (km) between two geographic points
    using the Haversine formula.

    Parameters
    ----------
    lat1, lon1 : float
        Latitude and longitude of point 1 (decimal degrees).
    lat2, lon2 : float
        Latitude and longitude of point 2 (decimal degrees).

    Returns
    -------
    float
        Distance in kilometres.

    Phase 2 note
    ────────────
    Replace calls to this function with PostGIS ST_DWithin for indexed,
    server-side spatial queries once GeoAlchemy2 is integrated.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c


def is_within_radius(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    radius_km: float,
) -> bool:
    """
    Return True if two points are within `radius_km` of each other.

    Phase 2 duplicate detection will call this (or its PostGIS equivalent)
    to determine whether an incoming report is near an existing incident.
    """
    return haversine_distance(lat1, lon1, lat2, lon2) <= radius_km
