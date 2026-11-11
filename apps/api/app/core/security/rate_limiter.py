import logging
import sys
import time
from collections import defaultdict
from typing import Callable

from fastapi import HTTPException, Request, status

from app.config.settings import settings

logger = logging.getLogger(__name__)


def get_trusted_client_ip(request: Request) -> str:
    """Extract client IP safely by parsing X-Forwarded-For right-to-left, identifying the rightmost untrusted entry."""
    direct_ip = request.client.host if request.client else "127.0.0.1"
    trusted_proxies = (
        set(settings.TRUSTED_PROXIES)
        if isinstance(settings.TRUSTED_PROXIES, (list, set))
        else {p.strip() for p in settings.TRUSTED_PROXIES.split(",") if p.strip()}
    )

    if direct_ip not in trusted_proxies:
        return direct_ip

    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return direct_ip

    # Walk right-to-left: the rightmost untrusted IP is the real client IP
    ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
    for ip in reversed(ips):
        if ip not in trusted_proxies:
            return ip

    return ips[0] if ips else direct_ip


class BaseRateLimiterBackend:
    def is_allowed(self, key: str, times: int, seconds: int) -> tuple[bool, int]:
        raise NotImplementedError

    def reset(self) -> None:
        raise NotImplementedError


class InMemoryRateLimiterBackend(BaseRateLimiterBackend):
    def __init__(self):
        self._records: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, times: int, seconds: int) -> tuple[bool, int]:
        now = time.time()
        window_start = now - seconds
        timestamps = self._records[key]

        valid_timestamps = [ts for ts in timestamps if ts > window_start]
        self._records[key] = valid_timestamps

        if len(valid_timestamps) >= times:
            oldest = valid_timestamps[0]
            retry_after = max(1, int(seconds - (now - oldest)))
            return False, retry_after

        self._records[key].append(now)
        return True, 0

    def reset(self) -> None:
        self._records.clear()


class RedisRateLimiterBackend(BaseRateLimiterBackend):
    def __init__(self, redis_url: str):
        import redis
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)

    def is_allowed(self, key: str, times: int, seconds: int) -> tuple[bool, int]:
        try:
            now = time.time()
            window_start = now - seconds
            pipe = self.client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zrange(key, 0, 0, withscores=True)
            pipe.expire(key, seconds)
            results = pipe.execute()

            current_count = results[1]
            oldest_records = results[2]

            if current_count >= times:
                oldest_ts = oldest_records[0][1] if oldest_records else now
                retry_after = max(1, int(seconds - (now - oldest_ts)))
                return False, retry_after

            # Add current request timestamp
            self.client.zadd(key, {f"{now}": now})
            self.client.expire(key, seconds)
            return True, 0
        except Exception:
            # Graceful fallback to memory on transient Redis error
            return in_memory_backend.is_allowed(key, times, seconds)

    def reset(self) -> None:
        """Reset rate limiter records by key prefix without destructive database flushing."""
        try:
            keys = self.client.keys("ratelimit:*")
            if keys:
                self.client.delete(*keys)
        except Exception as exc:
            logger.warning("Failed to reset rate limiter keys in Redis: %s", exc)


in_memory_backend = InMemoryRateLimiterBackend()


def get_limiter_backend() -> BaseRateLimiterBackend:
    redis_url = getattr(settings, "REDIS_URL", None)
    # In test environments, always use fast deterministic in-memory backend
    if "pytest" in sys.modules or not redis_url:
        return in_memory_backend

    try:
        backend = RedisRateLimiterBackend(redis_url)
        backend.client.ping()
        return backend
    except Exception:
        return in_memory_backend


limiter_store = get_limiter_backend()


def rate_limit(times: int, seconds: int, scope: str = "default") -> Callable:
    """FastAPI dependency for rate limiting sensitive endpoints."""

    async def dependency(request: Request):
        if getattr(settings, "RATE_LIMIT_ENABLED", True) is False:
            return

        if "pytest" in sys.modules and request.headers.get("X-Test-Rate-Limit") != "enforce":
            return

        client_ip = get_trusted_client_ip(request)
        bucket_key = f"ratelimit:{scope}:{client_ip}"
        allowed, retry_after = limiter_store.is_allowed(bucket_key, times, seconds)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
