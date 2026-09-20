"""ResQGrid — Role-Based Access Control (RBAC) dependency."""
from __future__ import annotations

from typing import Callable
from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_roles(*allowed_roles: str) -> Callable:
    """FastAPI dependency for role-based access control.

    Reads 'X-Role' header. If missing, defaults to settings.DEFAULT_ROLE ('citizen').
    'admin' passes any check.
    Raises HTTP 403 Forbidden with {"detail": ...} if the role is not allowed.
    """
    normalized_allowed = {r.lower().strip() for r in allowed_roles}

    async def _role_checker(x_role: str | None = Header(default=None, alias="X-Role")) -> str:
        role = (x_role.lower().strip() if x_role else getattr(settings, "DEFAULT_ROLE", "citizen").lower().strip())
        if not role:
            role = "citizen"

        # Admin passes any check
        if role == "admin":
            return role

        # If no specific roles required, allow
        if not normalized_allowed:
            return role

        if role in normalized_allowed:
            return role

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' not authorized. Required: {sorted(list(normalized_allowed))}",
        )

    return _role_checker
