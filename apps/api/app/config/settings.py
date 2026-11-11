import os
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEV_SECRET = "dev-insecure-test-signing-key-not-for-prod-32chars"
INSECURE_SECRETS = {
    "prime-activist-secure-jwt-key-2026-production-min32chars",
    INSECURE_DEV_SECRET,
    "secret",
    "changeme",
    "default",
    "password",
    "12345678",
}


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Unified Platform API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./unified_platform.db",
    )

    # Redis & Event Brokers
    REDIS_URL: str = "redis://localhost:6379/0"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # Security & Tokens
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AUTH_COOKIE_NAME: str = "prime_refresh_token"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"

    # CORS Configuration
    ALLOWED_CORS_ORIGINS: str | list[str] = os.getenv(
        "ALLOWED_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000",
    )

    # Trusted reverse proxy IPs permitted to forward X-Forwarded-For headers
    TRUSTED_PROXIES: str | list[str] = os.getenv(
        "TRUSTED_PROXIES",
        "127.0.0.1,::1,localhost",
    )

    # Seed / Bootstrap Administrator (Explicitly separated between dev/test and production)
    ALLOW_ADMIN_BOOTSTRAP: bool = False
    DEFAULT_ADMIN_EMAIL: str = "admin@primebyactivist.com"
    DEFAULT_ADMIN_PASSWORD: str = ""
    DEFAULT_ADMIN_NAME: str = "Chief Pharmaceutical Administrator"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_environment_and_secrets(self) -> Self:
        env = (self.ENVIRONMENT or "development").strip().lower()

        # Production validation: FAIL CLOSED
        if env in ("production", "prod"):
            # 1. API_SECRET_KEY must be explicitly set and >= 32 chars
            if not self.API_SECRET_KEY or len(self.API_SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL CONFIGURATION ERROR: API_SECRET_KEY must be explicitly provided in production "
                    "and must be at least 32 cryptographically strong characters."
                )
            if self.API_SECRET_KEY.lower() in INSECURE_SECRETS or "insecure" in self.API_SECRET_KEY.lower():
                raise ValueError(
                    "CRITICAL SECURITY ERROR: Known insecure or default JWT secret key cannot be used in production."
                )

            # 2. Database URL must not be SQLite
            if "sqlite" in self.DATABASE_URL.lower():
                raise ValueError(
                    "CRITICAL CONFIGURATION ERROR: SQLite is forbidden in production. "
                    "A production-grade PostgreSQL connection string is required."
                )

            # 3. Default administrator credentials MUST NOT be hardcoded or silently accepted
            if self.DEFAULT_ADMIN_PASSWORD in ("PrimeAdmin@2026!", "") and self.ALLOW_ADMIN_BOOTSTRAP:
                raise ValueError(
                    "CRITICAL SECURITY ERROR: Default or empty administrator password cannot be used for "
                    "bootstrap in production. Set a unique, strong BOOTSTRAP_ADMIN_PASSWORD."
                )

            # 4. Enforce secure cookies in production
            self.AUTH_COOKIE_SECURE = True

            # 5. Normalize and validate CORS origins in production
            if isinstance(self.ALLOWED_CORS_ORIGINS, str):
                origins = [orig.strip() for orig in self.ALLOWED_CORS_ORIGINS.split(",") if orig.strip()]
            else:
                origins = [orig.strip() for orig in self.ALLOWED_CORS_ORIGINS if orig.strip()]

            # Production must not use wildcard '*' with allow_credentials=True
            if "*" in origins:
                raise ValueError("CRITICAL SECURITY ERROR: Wildcard '*' CORS origin is forbidden in production with credentials.")
            self.ALLOWED_CORS_ORIGINS = origins

        else:
            # Development / Test fallback
            if not self.API_SECRET_KEY:
                self.API_SECRET_KEY = INSECURE_DEV_SECRET
            if not self.DEFAULT_ADMIN_PASSWORD:
                self.DEFAULT_ADMIN_PASSWORD = "DevAdminPassword@2026!"
            self.ALLOW_ADMIN_BOOTSTRAP = True

            if isinstance(self.ALLOWED_CORS_ORIGINS, str):
                self.ALLOWED_CORS_ORIGINS = [orig.strip() for orig in self.ALLOWED_CORS_ORIGINS.split(",") if orig.strip()]

        # Normalize TRUSTED_PROXIES across all environments
        if isinstance(self.TRUSTED_PROXIES, str):
            self.TRUSTED_PROXIES = [p.strip() for p in self.TRUSTED_PROXIES.split(",") if p.strip()]

        return self


settings = Settings()
