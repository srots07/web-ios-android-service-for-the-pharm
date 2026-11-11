from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.database.models import PlatformSetting, User, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


class SettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    category: str
    updated_at: datetime
    updated_by_user_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SettingsResponse(BaseModel):
    settings: Dict[str, str]
    items: List[SettingItem]


class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, str] = Field(..., description="Key-value mapping of platform configuration settings.")


PERMITTED_SETTING_KEYS = {
    "company_name",
    "support_email",
    "support_phone",
    "default_currency",
    "quote_validity_days",
    "order_notification_email",
    "maintenance_mode",
}


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_admin: User = Depends(require_permission("settings.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve verified platform settings and configuration metadata."""
    stmt = select(PlatformSetting).order_by(PlatformSetting.category, PlatformSetting.key)
    res = await db.execute(stmt)
    records = res.scalars().all()

    kv_map = {s.key: s.value for s in records}
    items = [SettingItem.model_validate(s) for s in records]

    return SettingsResponse(settings=kv_map, items=items)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    payload: UpdateSettingsRequest,
    current_admin: User = Depends(require_permission("settings.update")),
    db: AsyncSession = Depends(get_db),
):
    """Persist administrative configuration settings and record audit trail."""
    updated_keys = []

    for key, value in payload.settings.items():
        if key not in PERMITTED_SETTING_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Setting key '{key}' is not configurable.",
            )

        stmt = select(PlatformSetting).where(PlatformSetting.key == key)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()

        if record:
            if record.value != value:
                record.value = value
                record.updated_at = utc_now()
                record.updated_by_user_id = current_admin.id
                updated_keys.append(key)
        else:
            record = PlatformSetting(
                key=key,
                value=value,
                category="general",
                updated_at=utc_now(),
                updated_by_user_id=current_admin.id,
            )
            db.add(record)
            updated_keys.append(key)

    if updated_keys:
        audit_event = AuditEvent(
            user_id=current_admin.id,
            event_type="SETTINGS_UPDATED",
            description=f"Settings updated ({', '.join(updated_keys)}) by {current_admin.email}",
            resource_type="settings",
            resource_id="platform_settings",
            created_at=utc_now(),
        )
        db.add(audit_event)

    await db.commit()
    return await get_settings(current_admin=current_admin, db=db)

