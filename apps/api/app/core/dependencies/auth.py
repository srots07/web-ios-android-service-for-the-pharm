
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.tokens import decode_access_token
from app.database.models import User, UserSession
from app.database.session import get_db

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency extracting and verifying the authenticated user."""
    token = None

    if credentials:
        token = credentials.credentials
    else:
        # Fallback to cookie if present
        token = request.cookies.get("prime_access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user record not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been disabled or suspended.",
        )

    # Global token revocation check (e.g., logout-all, password change, account suspension)
    token_ver = payload.get("token_version")
    if token_ver is not None and token_ver < user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Session-specific revocation check (e.g., single-device logout)
    sid = payload.get("sid")
    if sid:
        s_stmt = select(UserSession).where(UserSession.id == sid)
        s_res = await db.execute(s_stmt)
        sess = s_res.scalar_one_or_none()
        if sess and sess.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session and access token have been revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


async def require_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency verifying administrative privileges."""
    if current_user.role not in ("admin", "staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource.",
        )
    return current_user


def require_permission(permission_slug: str):
    """Factory dependency verifying that the requesting admin user possesses a specific permission."""
    async def permission_checker(
        current_user: User = Depends(require_admin_user),
    ) -> User:
        # If user has the global admin role, grant full access
        if current_user.role == "admin":
            return current_user

        # Otherwise evaluate user's assigned RBAC roles and permissions
        user_perm_slugs = {
            perm.slug
            for role in (current_user.roles or [])
            for perm in (role.permissions or [])
        }
        if permission_slug not in user_perm_slugs and "*.*" not in user_perm_slugs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: permission '{permission_slug}' is required.",
            )
        return current_user

    return permission_checker


