import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Unified Platform API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./unified_platform.db"
    )

    # Redis & Event Brokers
    REDIS_URL: str = "redis://localhost:6379/0"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # Security & Tokens
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "prime-activist-secure-jwt-key-2026-production-min32chars")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AUTH_COOKIE_NAME: str = "prime_refresh_token"

    # Default Seed Administrator
    DEFAULT_ADMIN_EMAIL: str = "admin@primebyactivist.com"
    DEFAULT_ADMIN_PASSWORD: str = "PrimeAdmin@2026!"
    DEFAULT_ADMIN_NAME: str = "Chief Pharmaceutical Administrator"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
