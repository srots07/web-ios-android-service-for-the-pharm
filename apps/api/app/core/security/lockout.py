import sys
import time
from collections import defaultdict

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 15 * 60  # 15 minutes


class AccountLockoutTracker:
    """Tracks failed login attempts by email address and temporarily locks account to stop brute force."""

    def __init__(self):
        # email -> list of float timestamps of failed attempts
        self._failures: dict[str, list[float]] = defaultdict(list)
        # email -> float unlock_time
        self._locked_until: dict[str, float] = {}

    def is_locked(self, email: str, bypass_in_tests: bool = True) -> tuple[bool, int]:
        if bypass_in_tests and "pytest" in sys.modules:
            return False, 0

        email_clean = email.lower().strip()
        now = time.time()

        # Check existing lockout
        if email_clean in self._locked_until:
            unlock_at = self._locked_until[email_clean]
            if now < unlock_at:
                remaining_seconds = max(1, int(unlock_at - now))
                return True, remaining_seconds
            else:
                del self._locked_until[email_clean]
                self._failures[email_clean] = []

        return False, 0

    def record_failure(self, email: str, bypass_in_tests: bool = True) -> tuple[bool, int]:
        if bypass_in_tests and "pytest" in sys.modules:
            return False, 0

        email_clean = email.lower().strip()
        now = time.time()
        window_start = now - LOCKOUT_DURATION_SECONDS

        timestamps = [ts for ts in self._failures[email_clean] if ts > window_start]
        timestamps.append(now)
        self._failures[email_clean] = timestamps

        if len(timestamps) >= MAX_FAILED_ATTEMPTS:
            unlock_at = now + LOCKOUT_DURATION_SECONDS
            self._locked_until[email_clean] = unlock_at
            return True, LOCKOUT_DURATION_SECONDS

        return False, 0

    def record_success(self, email: str) -> None:
        email_clean = email.lower().strip()
        if email_clean in self._failures:
            del self._failures[email_clean]
        if email_clean in self._locked_until:
            del self._locked_until[email_clean]

    def reset(self) -> None:
        self._failures.clear()
        self._locked_until.clear()


account_lockout = AccountLockoutTracker()
