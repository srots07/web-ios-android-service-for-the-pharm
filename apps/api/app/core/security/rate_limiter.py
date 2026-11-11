import sys
import time
from collections import defaultdict
from typing import Callable

from fastapi import HTTPException, Request, status

from app.config.settings import settings


class InMemorySlidingWindowLimiter:
    """In-memory sliding window rate limiter tracking request timestamps per client IP and key."""

    def __init__(self):
        # key -> list of float timestamps
        self._records: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, times: int, seconds: int) -> tuple[bool, int]:
        now = time.time()
        window_start = now - seconds
        timestamps = self._records[key]

        # Purge timestamps outside the current window
        valid_timestamps = [ts for ts in timestamps if ts > window_start]
        self._records[key] = valid_timestamps

        if len(valid_timestamps) >= times:
            oldest_in_window = valid_timestamps[0]
            retry_after = max(1, int(seconds - (now - oldest_in_window)))
            return False, retry_after

        self._records[key].append(now)
        return True, 0

    def reset(self):
        """Reset all rate limiter records (useful for test isolation)."""
        self._records.clear()


limiter_store = InMemorySlidingWindowLimiter()


def rate_limit(times: int, seconds: int, scope: str = "default") -> Callable:
    """FastAPI dependency for rate limiting sensitive endpoints."""

    async def dependency(request: Request):
        # In test suite without explicit enforcement header, bypass to avoid test suite thrashing
        if getattr(settings, "RATE_LIMIT_ENABLED", True) is False:
            return

        if "pytest" in sys.modules and request.headers.get("X-Test-Rate-Limit") != "enforce":
            return

        # Identify client IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        bucket_key = f"{scope}:{client_ip}"
        allowed, retry_after = limiter_store.is_allowed(bucket_key, times, seconds)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
