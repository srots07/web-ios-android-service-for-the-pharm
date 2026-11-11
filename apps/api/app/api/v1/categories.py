from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database.session import get_db
from app.database.models import ProductCategory

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategorySchema(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[CategorySchema])
async def list_categories(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all verified pharmaceutical categories persisted in the platform database."""
    stmt = select(ProductCategory).order_by(ProductCategory.display_order.asc(), ProductCategory.name.asc())
    res = await db.execute(stmt)
    categories = res.scalars().all()
    return [CategorySchema.model_validate(c) for c in categories]

