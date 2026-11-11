from fastapi import Response

from app.config.settings import settings


def set_auth_cookie(response: Response, raw_token: str, max_age_days: int | None = None) -> None:
    """Set hardened HttpOnly authentication refresh cookie."""
    days = max_age_days if max_age_days is not None else settings.REFRESH_TOKEN_EXPIRE_DAYS
    is_secure = settings.AUTH_COOKIE_SECURE or settings.ENVIRONMENT == "production"

    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=is_secure,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        max_age=days * 86400,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    """Consistently revoke and clear authentication cookies across the platform."""
    is_secure = settings.AUTH_COOKIE_SECURE or settings.ENVIRONMENT == "production"
    cookie_keys = [settings.AUTH_COOKIE_NAME, "prime_access_token"]

    for key in cookie_keys:
        response.delete_cookie(
            key=key,
            path="/",
            httponly=True,
            secure=is_secure,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )

