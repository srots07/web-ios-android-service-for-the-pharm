import time

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.database.session import get_db

router = APIRouter(prefix="/health", tags=["Health & Readiness"])

_START_TIME = time.time()


@router.get("", summary="Liveness Probe")
async def health_liveness():
    """Liveness probe: verifies the process is running and responding to requests."""
    return {
        "status": "healthy",
        "service": "prime-core-api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": round(time.time() - _START_TIME, 2),
    }


@router.get("/ready", summary="Readiness Probe")
async def health_readiness(db: AsyncSession = Depends(get_db)):
    """Readiness probe: checks critical downstream dependencies (database connection).

    Fails closed with HTTP 503 Service Unavailable if downstream connectivity is interrupted.
    """
    checks = {
        "database": "unknown",
    }
    healthy = True

    # 1. Check Database connectivity
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except (SQLAlchemyError, OSError) as exc:
        checks["database"] = f"unhealthy: {type(exc).__name__}"
        healthy = False

    status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if healthy else "not_ready",
            "service": "prime-core-api",
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "checks": checks,
        },
    )
