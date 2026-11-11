from typing import Optional, List
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime

from app.database.session import get_db
from app.database.models import Role, Permission, User, AuditEvent, user_roles, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(prefix="/admin", tags=["Roles & Permissions"])


# --- Schemas ---

class PermissionSchema(BaseModel):
    id: str
    slug: str
    name: str
    module: str
    description: str

    model_config = ConfigDict(from_attributes=True)


class RoleDetailSchema(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    is_system: bool
    created_at: datetime
    permissions: List[PermissionSchema] = []
    user_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CreateRoleRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=2, max_length=255)
    permission_ids: List[str] = Field(default_factory=list)


class UpdateRoleRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, min_length=2, max_length=255)
    permission_ids: Optional[List[str]] = None


# --- Endpoints ---

@router.get("/permissions", response_model=List[PermissionSchema])
async def list_permissions(
    module: Optional[str] = Query(None, description="Filter by functional module"),
    current_user: User = Depends(require_permission("roles.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all system permissions available for role composition."""
    query = select(Permission)
    if module:
        query = query.where(func.lower(Permission.module) == module.strip().lower())

    query = query.order_by(Permission.module.asc(), Permission.name.asc())
    res = await db.execute(query)
    permissions = res.scalars().all()

    return [PermissionSchema.model_validate(p) for p in permissions]


@router.get("/roles", response_model=List[RoleDetailSchema])
async def list_roles(
    current_user: User = Depends(require_permission("roles.read")),
    db: AsyncSession = Depends(get_db),
):
    """List all platform roles with their assigned permissions and member counts."""
    stmt = select(Role).order_by(Role.is_system.desc(), Role.name.asc())
    res = await db.execute(stmt)
    roles = res.scalars().all()

    output = []
    for r in roles:
        # Count assigned users
        count_stmt = select(func.count()).select_from(user_roles).where(user_roles.c.role_id == r.id)
        count_res = await db.execute(count_stmt)
        user_count = count_res.scalar() or 0

        output.append(
            RoleDetailSchema(
                id=r.id,
                name=r.name,
                slug=r.slug,
                description=r.description,
                is_system=r.is_system,
                created_at=r.created_at,
                permissions=[PermissionSchema.model_validate(p) for p in (r.permissions or [])],
                user_count=user_count,
            )
        )

    return output


@router.get("/roles/{role_id}", response_model=RoleDetailSchema)
async def get_role_detail(
    role_id: str,
    current_user: User = Depends(require_permission("roles.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details for a single role."""
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    count_stmt = select(func.count()).select_from(user_roles).where(user_roles.c.role_id == role.id)
    count_res = await db.execute(count_stmt)
    user_count = count_res.scalar() or 0

    return RoleDetailSchema(
        id=role.id,
        name=role.name,
        slug=role.slug,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        permissions=[PermissionSchema.model_validate(p) for p in (role.permissions or [])],
        user_count=user_count,
    )


@router.post("/roles", response_model=RoleDetailSchema, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: CreateRoleRequest,
    current_user: User = Depends(require_permission("roles.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom administrative role."""
    # Generate slug
    slug = re.sub(r'[^a-zA-Z0-9]+', '_', payload.name.strip().lower()).strip('_')

    # Check unique slug & name
    check_stmt = select(Role).where(or_(func.lower(Role.name) == payload.name.strip().lower(), Role.slug == slug))
    existing = await db.execute(check_stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A role with this name already exists.")

    role = Role(
        name=payload.name.strip(),
        slug=slug,
        description=payload.description.strip(),
        is_system=False,
        created_at=utc_now(),
    )

    if payload.permission_ids:
        p_stmt = select(Permission).where(Permission.id.in_(payload.permission_ids))
        p_res = await db.execute(p_stmt)
        role.permissions = list(p_res.scalars().all())

    db.add(role)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="ROLE_CREATED",
        description=f"Custom role '{role.name}' created by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(role)

    return RoleDetailSchema(
        id=role.id,
        name=role.name,
        slug=role.slug,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        permissions=[PermissionSchema.model_validate(p) for p in (role.permissions or [])],
        user_count=0,
    )


@router.patch("/roles/{role_id}", response_model=RoleDetailSchema)
async def update_role(
    role_id: str,
    payload: UpdateRoleRequest,
    current_user: User = Depends(require_permission("roles.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Update role specifications and assigned permissions."""
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Protection: Super Administrator system role cannot have its permissions revoked or modified
    if role.slug == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The Super Administrator role is immutable and cannot be modified.",
        )

    if payload.name is not None and not role.is_system:
        role.name = payload.name.strip()

    if payload.description is not None:
        role.description = payload.description.strip()

    if payload.permission_ids is not None:
        p_stmt = select(Permission).where(Permission.id.in_(payload.permission_ids))
        p_res = await db.execute(p_stmt)
        role.permissions = list(p_res.scalars().all())

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="ROLE_UPDATED",
        description=f"Role '{role.name}' updated by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(role)

    count_stmt = select(func.count()).select_from(user_roles).where(user_roles.c.role_id == role.id)
    count_res = await db.execute(count_stmt)
    user_count = count_res.scalar() or 0

    return RoleDetailSchema(
        id=role.id,
        name=role.name,
        slug=role.slug,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        permissions=[PermissionSchema.model_validate(p) for p in (role.permissions or [])],
        user_count=user_count,
    )


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    current_user: User = Depends(require_permission("roles.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a custom role. System-defined roles are protected."""
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"System role '{role.name}' cannot be removed.",
        )

    role_name = role.name
    await db.delete(role)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="ROLE_DELETED",
        description=f"Custom role '{role_name}' deleted by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()

    return {"status": "success", "message": f"Role '{role_name}' has been deleted."}

