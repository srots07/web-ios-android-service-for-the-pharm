from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update
from datetime import datetime

from app.database.session import get_db
from app.database.models import User, UserSession, Role, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(prefix="/admin/users", tags=["Admin Users"])


# --- Schemas ---

class RoleSummary(BaseModel):
    id: str
    name: str
    slug: str
    is_system: bool

    model_config = ConfigDict(from_attributes=True)


class UserListItem(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    account_type: str
    phone: Optional[str] = None
    country: Optional[str] = None
    company_name: Optional[str] = None
    business_address: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    roles: List[RoleSummary] = []

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(UserListItem):
    active_sessions_count: int = 0


class PaginatedUsersResponse(BaseModel):
    items: List[UserListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    company_name: Optional[str] = Field(None, max_length=255)
    business_address: Optional[str] = None
    account_type: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None, pattern="^(admin|staff|customer)$")
    role_ids: Optional[List[str]] = None


class UserStatusResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    message: str


# --- Endpoints ---

@router.get("", response_model=PaginatedUsersResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name or email"),
    role: Optional[str] = Query(None, description="Filter by primary role (admin/staff/customer)"),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (active/suspended/all)"),
    current_user: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
):
    """List platform users with search, multi-field filtering and pagination."""
    query = select(User)

    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(User.full_name).like(search_fmt),
                func.lower(User.email).like(search_fmt),
                func.lower(User.phone).like(search_fmt),
            )
        )

    if role:
        query = query.where(User.role == role)

    if account_type:
        query = query.where(User.account_type == account_type)

    if status_filter == "active":
        query = query.where(User.is_active.is_(True))
    elif status_filter == "suspended":
        query = query.where(User.is_active.is_(False))

    # Calculate total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate and order by newest first
    offset = (page - 1) * limit
    paged_query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    users_res = await db.execute(paged_query)
    users = users_res.scalars().all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return PaginatedUsersResponse(
        items=[UserListItem.model_validate(u) for u in users],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user_details(
    user_id: str,
    current_user: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed user profile including assigned RBAC roles and session counts."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Count active sessions
    session_stmt = select(func.count(UserSession.id)).where(
        UserSession.user_id == user.id,
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > utc_now(),
    )
    session_res = await db.execute(session_stmt)
    active_sessions = session_res.scalar() or 0

    return UserDetailResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        account_type=user.account_type,
        phone=user.phone,
        country=user.country,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=[RoleSummary.model_validate(r) for r in user.roles],
        active_sessions_count=active_sessions,
    )


@router.patch("/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    current_user: User = Depends(require_permission("users.update")),
    db: AsyncSession = Depends(get_db),
):
    """Update user information and role assignments."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Protect against modifying super_admin if requester is not a super_admin
    user_role_slugs = {r.slug for r in user.roles}
    requester_role_slugs = {r.slug for r in current_user.roles}
    if "super_admin" in user_role_slugs and "super_admin" not in requester_role_slugs and current_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Modifications to Super Administrator accounts require Super Administrator authorization.",
        )

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip() or None
    if payload.country is not None:
        user.country = payload.country.strip() or None
    if payload.company_name is not None:
        user.company_name = payload.company_name.strip() or None
    if payload.business_address is not None:
        user.business_address = payload.business_address.strip() or None
    if payload.account_type is not None:
        user.account_type = payload.account_type.strip()
    if payload.role is not None and payload.role != user.role:
        if "super_admin" in user_role_slugs or user.role == "admin":
            active_super_admins = await db.scalar(
                select(func.count(User.id))
                .join(User.roles)
                .where(Role.slug == "super_admin", User.is_active == True)
            )
            if (active_super_admins or 0) <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove or demote the last active Super Admin account.",
                )
        user.role = payload.role

    if payload.role_ids is not None:
        roles_stmt = select(Role).where(Role.id.in_(payload.role_ids))
        roles_res = await db.execute(roles_stmt)
        matched_roles = roles_res.scalars().all()

        # Prevent privilege escalation: only super_admin can assign super_admin
        if any(r.slug == "super_admin" for r in matched_roles) and "super_admin" not in requester_role_slugs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assigning Super Administrator role requires Super Administrator privilege.",
            )

        # Protect last active super_admin from losing role
        if "super_admin" in user_role_slugs and not any(r.slug == "super_admin" for r in matched_roles):
            active_super_admins = await db.scalar(
                select(func.count(User.id))
                .join(User.roles)
                .where(Role.slug == "super_admin", User.is_active == True)
            )
            if (active_super_admins or 0) <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove Super Administrator role from the last active Super Administrator.",
                )

        user.roles = list(matched_roles)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="USER_UPDATED",
        description=f"User {user.email} profile/roles updated by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(user)

    return await get_user_details(user_id=user.id, current_user=current_user, db=db)


@router.post("/{user_id}/suspend", response_model=UserStatusResponse)
async def suspend_user(
    user_id: str,
    current_user: User = Depends(require_permission("users.suspend")),
    db: AsyncSession = Depends(get_db),
):
    """Suspend a user account and immediately revoke all active sessions."""
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot suspend your own administrative account.")

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_role_slugs = {r.slug for r in user.roles}
    if "super_admin" in user_role_slugs or user.role == "admin":
        requester_role_slugs = {r.slug for r in current_user.roles}
        if "super_admin" not in requester_role_slugs:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot suspend administrator accounts.")

    if "super_admin" in user_role_slugs:
        active_super_admins = await db.scalar(
            select(func.count(User.id))
            .join(User.roles)
            .where(Role.slug == "super_admin", User.is_active == True)
        )
        if (active_super_admins or 0) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot suspend the last remaining active Super Administrator account.",
            )

    user.is_active = False

    # Revoke all active sessions
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=utc_now())
    )

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="USER_SUSPENDED",
        description=f"User {user.email} suspended and active sessions revoked by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()

    return UserStatusResponse(
        id=user.id,
        email=user.email,
        is_active=False,
        message="User account suspended and active sessions terminated.",
    )


@router.post("/{user_id}/activate", response_model=UserStatusResponse)
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_permission("users.suspend")),
    db: AsyncSession = Depends(get_db),
):
    """Reactivate a suspended user account."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = True

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="USER_ACTIVATED",
        description=f"User {user.email} reactivated by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()

    return UserStatusResponse(
        id=user.id,
        email=user.email,
        is_active=True,
        message="User account reactivated successfully.",
    )


@router.post("/{user_id}/revoke-sessions")
async def revoke_user_sessions(
    user_id: str,
    current_user: User = Depends(require_permission("users.suspend")),
    db: AsyncSession = Depends(get_db),
):
    """Force revoke all active sessions for a user."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=utc_now())
    )

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="USER_SESSIONS_REVOKED",
        description=f"All active sessions for user {user.email} were revoked by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()

    return {"status": "success", "message": f"All sessions for {user.email} have been revoked."}

