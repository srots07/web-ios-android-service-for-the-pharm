from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ProductCategory
from app.database.session import get_db

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategorySchema(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    display_order: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[CategorySchema])
async def list_categories(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all verified pharmaceutical categories persisted in the platform database."""
    stmt = select(ProductCategory).order_by(ProductCategory.display_order.asc(), ProductCategory.name.asc())
    res = await db.execute(stmt)
    categories = res.scalars().all()
    return [CategorySchema.model_validate(c) for c in categories]

