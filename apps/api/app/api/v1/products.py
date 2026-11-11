from typing import Optional, List
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete
from datetime import datetime

from app.database.session import get_db
from app.database.models import ProductItem, ProductDocument, User, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(tags=["Products"])


# --- Schemas ---

class ProductDocumentSchema(BaseModel):
    id: str
    product_id: str
    title: str
    document_type: str
    file_path: str
    file_size: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDocumentCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    document_type: str = Field(..., min_length=2, max_length=100)
    file_path: str = Field(..., min_length=2, max_length=255)
    file_size: Optional[int] = None


class ProductItemSchema(BaseModel):
    id: str
    name: str
    category: str
    sku: str
    product_code: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    composition: Optional[str] = None
    pack_size: str
    description: Optional[str] = ""
    storage_conditions: Optional[str] = None
    shelf_life: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    is_published: bool
    created_at: datetime
    updated_at: datetime
    documents: List[ProductDocumentSchema] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedProductsResponse(BaseModel):
    items: List[ProductItemSchema]
    total: int
    page: int
    limit: int
    total_pages: int


class CreateProductRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., min_length=2, max_length=100)
    sku: str = Field(..., min_length=2, max_length=50)
    product_code: Optional[str] = Field(None, max_length=50)
    dosage_form: Optional[str] = Field(None, max_length=100)
    strength: Optional[str] = Field(None, max_length=100)
    composition: Optional[str] = None
    pack_size: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""
    storage_conditions: Optional[str] = Field(None, max_length=255)
    shelf_life: Optional[str] = Field(None, max_length=100)
    image_url: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field("Published", pattern="^(Draft|Published|Archived)$")


class UpdateProductRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    sku: Optional[str] = Field(None, min_length=2, max_length=50)
    product_code: Optional[str] = Field(None, max_length=50)
    dosage_form: Optional[str] = Field(None, max_length=100)
    strength: Optional[str] = Field(None, max_length=100)
    composition: Optional[str] = None
    pack_size: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    storage_conditions: Optional[str] = Field(None, max_length=255)
    shelf_life: Optional[str] = Field(None, max_length=100)
    image_url: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, pattern="^(Draft|Published|Archived)$")


# --- Public Catalogue Endpoints ---

@router.get("/products", response_model=List[ProductItemSchema])
async def list_public_products(
    category: Optional[str] = Query(None, description="Filter by pharmaceutical category"),
    search: Optional[str] = Query(None, description="Search by product name, active ingredient or SKU"),
    db: AsyncSession = Depends(get_db),
):
    """Public catalogue endpoint returning all verified active pharmaceutical formulations."""
    query = select(ProductItem).where(
        or_(
            ProductItem.is_published.is_(True),
            ProductItem.status == "Published",
        )
    )

    if category and category.lower() != "all":
        query = query.where(func.lower(ProductItem.category) == category.strip().lower())

    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(ProductItem.name).like(search_fmt),
                func.lower(ProductItem.sku).like(search_fmt),
                func.lower(ProductItem.composition).like(search_fmt),
                func.lower(ProductItem.description).like(search_fmt),
            )
        )

    query = query.order_by(ProductItem.name.asc())
    result = await db.execute(query)
    products = result.scalars().all()

    return [ProductItemSchema.model_validate(p) for p in products]


# --- Admin Products Endpoints ---

@router.get("/admin/products", response_model=PaginatedProductsResponse)
async def list_admin_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name, SKU, or active ingredients"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Draft/Published/Archived)"),
    current_user: User = Depends(require_permission("products.read")),
    db: AsyncSession = Depends(get_db),
):
    """Administrative product catalogue list with filters, full status control, and pagination."""
    query = select(ProductItem)

    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(ProductItem.name).like(search_fmt),
                func.lower(ProductItem.sku).like(search_fmt),
                func.lower(ProductItem.product_code).like(search_fmt),
                func.lower(ProductItem.composition).like(search_fmt),
            )
        )

    if category and category.lower() != "all":
        query = query.where(func.lower(ProductItem.category) == category.strip().lower())

    if status_filter and status_filter.lower() != "all":
        query = query.where(func.lower(ProductItem.status) == status_filter.strip().lower())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    paged_query = query.order_by(ProductItem.created_at.desc()).offset(offset).limit(limit)
    items_res = await db.execute(paged_query)
    items = items_res.scalars().all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return PaginatedProductsResponse(
        items=[ProductItemSchema.model_validate(p) for p in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/admin/products", response_model=ProductItemSchema, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: CreateProductRequest,
    current_user: User = Depends(require_permission("products.create")),
    db: AsyncSession = Depends(get_db),
):
    """Register a new pharmaceutical formulation with strict SKU uniqueness check."""
    # Check duplicate SKU
    sku_check = select(ProductItem).where(func.lower(ProductItem.sku) == payload.sku.strip().lower())
    existing = await db.execute(sku_check)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A formulation with SKU '{payload.sku}' already exists in the catalog.",
        )

    # Generate slug ID from name & SKU
    clean_sku = re.sub(r'[^a-zA-Z0-9]', '', payload.sku).lower()
    prod_id = f"prm-{clean_sku}-{str(uuid.uuid4())[:6]}"

    is_pub = payload.status == "Published"

    product = ProductItem(
        id=prod_id,
        name=payload.name.strip(),
        category=payload.category.strip(),
        sku=payload.sku.strip().upper(),
        product_code=payload.product_code.strip() if payload.product_code else None,
        dosage_form=payload.dosage_form.strip() if payload.dosage_form else None,
        strength=payload.strength.strip() if payload.strength else None,
        composition=payload.composition.strip() if payload.composition else None,
        pack_size=payload.pack_size.strip(),
        description=payload.description.strip() if payload.description else "",
        storage_conditions=payload.storage_conditions.strip() if payload.storage_conditions else None,
        shelf_life=payload.shelf_life.strip() if payload.shelf_life else None,
        image_url=payload.image_url.strip() if payload.image_url else None,
        status=payload.status,
        is_published=is_pub,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(product)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_CREATED",
        description=f"Formulation '{product.name}' (SKU: {product.sku}) created by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(product)

    return ProductItemSchema.model_validate(product)


@router.get("/admin/products/{product_id}", response_model=ProductItemSchema)
async def get_product_detail(
    product_id: str,
    current_user: User = Depends(require_permission("products.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full pharmaceutical specifications and attached documents for a single product."""
    stmt = select(ProductItem).where(ProductItem.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product formulation not found")

    return ProductItemSchema.model_validate(product)


@router.patch("/admin/products/{product_id}", response_model=ProductItemSchema)
async def update_product(
    product_id: str,
    payload: UpdateProductRequest,
    current_user: User = Depends(require_permission("products.update")),
    db: AsyncSession = Depends(get_db),
):
    """Update formulation attributes and specifications."""
    stmt = select(ProductItem).where(ProductItem.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product formulation not found")

    if payload.sku is not None and payload.sku.strip().upper() != product.sku:
        # Check uniqueness of target SKU
        sku_check = select(ProductItem).where(
            func.lower(ProductItem.sku) == payload.sku.strip().lower(),
            ProductItem.id != product.id,
        )
        existing = await db.execute(sku_check)
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another formulation already utilizes SKU '{payload.sku}'.",
            )
        product.sku = payload.sku.strip().upper()

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.category is not None:
        product.category = payload.category.strip()
    if payload.product_code is not None:
        product.product_code = payload.product_code.strip() or None
    if payload.dosage_form is not None:
        product.dosage_form = payload.dosage_form.strip() or None
    if payload.strength is not None:
        product.strength = payload.strength.strip() or None
    if payload.composition is not None:
        product.composition = payload.composition.strip() or None
    if payload.pack_size is not None:
        product.pack_size = payload.pack_size.strip()
    if payload.description is not None:
        product.description = payload.description.strip()
    if payload.storage_conditions is not None:
        product.storage_conditions = payload.storage_conditions.strip() or None
    if payload.shelf_life is not None:
        product.shelf_life = payload.shelf_life.strip() or None
    if payload.image_url is not None:
        product.image_url = payload.image_url.strip() or None
    if payload.status is not None:
        product.status = payload.status
        product.is_published = (payload.status == "Published")

    product.updated_at = utc_now()

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_UPDATED",
        description=f"Formulation '{product.name}' (SKU: {product.sku}) updated by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(product)

    return ProductItemSchema.model_validate(product)


@router.post("/admin/products/{product_id}/publish", response_model=ProductItemSchema)
async def publish_product(
    product_id: str,
    current_user: User = Depends(require_permission("products.publish")),
    db: AsyncSession = Depends(get_db),
):
    """Publish formulation to public catalogue."""
    stmt = select(ProductItem).where(ProductItem.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product formulation not found")

    product.status = "Published"
    product.is_published = True
    product.updated_at = utc_now()

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_PUBLISHED",
        description=f"Formulation '{product.name}' (SKU: {product.sku}) published by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(product)

    return ProductItemSchema.model_validate(product)


@router.post("/admin/products/{product_id}/archive", response_model=ProductItemSchema)
async def archive_product(
    product_id: str,
    current_user: User = Depends(require_permission("products.publish")),
    db: AsyncSession = Depends(get_db),
):
    """Archive formulation, hiding it from public catalogue while preserving audit trails."""
    stmt = select(ProductItem).where(ProductItem.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product formulation not found")

    product.status = "Archived"
    product.is_published = False
    product.updated_at = utc_now()

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_ARCHIVED",
        description=f"Formulation '{product.name}' (SKU: {product.sku}) archived by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(product)

    return ProductItemSchema.model_validate(product)


@router.post("/admin/products/{product_id}/documents", response_model=ProductDocumentSchema, status_code=status.HTTP_201_CREATED)
async def add_product_document(
    product_id: str,
    payload: ProductDocumentCreate,
    current_user: User = Depends(require_permission("products.update")),
    db: AsyncSession = Depends(get_db),
):
    """Attach technical dossiers, COAs, or regulatory documents to product formulation."""
    stmt = select(ProductItem).where(ProductItem.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product formulation not found")

    doc = ProductDocument(
        product_id=product.id,
        title=payload.title.strip(),
        document_type=payload.document_type.strip(),
        file_path=payload.file_path.strip(),
        file_size=payload.file_size,
        created_at=utc_now(),
    )
    db.add(doc)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_DOCUMENT_ADDED",
        description=f"Document '{doc.title}' ({doc.document_type}) attached to {product.name} by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(doc)

    return ProductDocumentSchema.model_validate(doc)


@router.delete("/admin/products/{product_id}/documents/{document_id}")
async def delete_product_document(
    product_id: str,
    document_id: str,
    current_user: User = Depends(require_permission("products.update")),
    db: AsyncSession = Depends(get_db),
):
    """Remove attached technical document."""
    stmt = select(ProductDocument).where(ProductDocument.id == document_id, ProductDocument.product_id == product_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc_title = doc.title
    await db.delete(doc)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_DOCUMENT_REMOVED",
        description=f"Document '{doc_title}' removed from formulation {product_id} by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()

    return {"status": "success", "message": f"Document '{doc_title}' removed."}


@router.delete("/admin/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(require_permission("products.delete")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a pharmaceutical product formulation and attached documents."""
    stmt = select(ProductItem).where(ProductItem.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product formulation not found")

    prod_name = product.name
    prod_sku = product.sku
    await db.delete(product)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="PRODUCT_DELETED",
        description=f"Formulation '{prod_name}' (SKU: {prod_sku}) deleted by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)
    await db.commit()

    return {"status": "success", "message": f"Product '{prod_name}' successfully deleted."}


