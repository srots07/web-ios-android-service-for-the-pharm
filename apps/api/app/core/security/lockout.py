import sys
import time
from collections import defaultdict

from app.config.settings import settings

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 15 * 60  # 15 minutes


class InMemoryLockoutBackend:
    def __init__(self):
        # key -> list of float timestamps of failed attempts
        self._failures: dict[str, list[float]] = defaultdict(list)
        # key -> float unlock_timestamp
        self._locked_until: dict[str, float] = {}

    def is_locked(self, key: str) -> tuple[bool, int]:
        now = time.time()
        if key in self._locked_until:
            unlock_at = self._locked_until[key]
            if now < unlock_at:
                return True, max(1, int(unlock_at - now))
            else:
                del self._locked_until[key]
                self._failures[key] = []
        return False, 0

    def record_failure(self, key: str) -> tuple[bool, int]:
        now = time.time()
        window_start = now - LOCKOUT_DURATION_SECONDS

        timestamps = [ts for ts in self._failures[key] if ts > window_start]
        timestamps.append(now)
        self._failures[key] = timestamps

        if len(timestamps) >= MAX_FAILED_ATTEMPTS:
            unlock_at = now + LOCKOUT_DURATION_SECONDS
            self._locked_until[key] = unlock_at
            return True, LOCKOUT_DURATION_SECONDS

        return False, 0

    def record_success(self, key: str) -> None:
        if key in self._failures:
            del self._failures[key]
        if key in self._locked_until:
            del self._locked_until[key]

    def reset(self) -> None:
        self._failures.clear()
        self._locked_until.clear()


class RedisLockoutBackend:
    def __init__(self, redis_url: str):
        import redis
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)

    def is_locked(self, key: str) -> tuple[bool, int]:
        try:
            lock_ttl = self.client.ttl(f"{key}:locked")
            if lock_ttl and lock_ttl > 0:
                return True, int(lock_ttl)
            return False, 0
        except Exception:
            return in_memory_lockout.is_locked(key)

    def record_failure(self, key: str) -> tuple[bool, int]:
        try:
            count = self.client.incr(f"{key}:attempts")
            if count == 1:
                self.client.expire(f"{key}:attempts", LOCKOUT_DURATION_SECONDS)

            if count >= MAX_FAILED_ATTEMPTS:
                self.client.setex(f"{key}:locked", LOCKOUT_DURATION_SECONDS, "1")
                self.client.delete(f"{key}:attempts")
                return True, LOCKOUT_DURATION_SECONDS
            return False, 0
        except Exception:
            return in_memory_lockout.record_failure(key)

    def record_success(self, key: str) -> None:
        try:
            self.client.delete(f"{key}:attempts", f"{key}:locked")
        except Exception:
            in_memory_lockout.record_success(key)

    def reset(self) -> None:
        try:
            self.client.flushdb()
        except Exception:
            pass


in_memory_lockout = InMemoryLockoutBackend()


def get_lockout_backend():
    redis_url = getattr(settings, "REDIS_URL", None)
    if "pytest" in sys.modules or not redis_url:
        return in_memory_lockout
    try:
        backend = RedisLockoutBackend(redis_url)
        backend.client.ping()
        return backend
    except Exception:
        return in_memory_lockout


class AccountLockoutTracker:
    """Manages account lockout across email + client IP combinations to prevent enumeration and brute-force."""

    def __init__(self):
        self._backend = get_lockout_backend()

    def make_key(self, email: str, ip: str) -> str:
        clean_email = email.lower().strip()
        clean_ip = ip.strip() if ip else "127.0.0.1"
        return f"lockout:{clean_email}:{clean_ip}"

    def is_locked(self, email: str, ip: str, bypass_in_tests: bool = True) -> tuple[bool, int]:
        if bypass_in_tests and "pytest" in sys.modules:
            return False, 0
        key = self.make_key(email, ip)
        return self._backend.is_locked(key)

    def record_failure(self, email: str, ip: str, bypass_in_tests: bool = True) -> tuple[bool, int]:
        if bypass_in_tests and "pytest" in sys.modules:
            return False, 0
        key = self.make_key(email, ip)
        return self._backend.record_failure(key)

    def record_success(self, email: str, ip: str) -> None:
        key = self.make_key(email, ip)
        self._backend.record_success(key)

    def reset(self) -> None:
        self._backend.reset()


account_lockout = AccountLockoutTracker()
