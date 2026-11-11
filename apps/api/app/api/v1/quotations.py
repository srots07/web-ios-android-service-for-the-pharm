from typing import Optional, List
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database.session import get_db
from app.database.models import Quotation, QuotationItem, Order, User, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(prefix="/admin/quotations", tags=["Admin Quotations"])

VALID_QUOTATION_STATUSES = ["Draft", "Sent", "Accepted", "Expired", "Declined"]

QUOTATION_STATE_TRANSITIONS = {
    "Draft": ["Sent", "Declined"],
    "Sent": ["Accepted", "Declined", "Expired"],
    "Accepted": [],
    "Declined": [],
    "Expired": [],
}


# --- Schemas ---

class QuotationItemCreate(BaseModel):
    product_id: str
    product_name: str
    sku: str
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0.0)


class QuotationItemSchema(BaseModel):
    id: str
    quotation_id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = ConfigDict(from_attributes=True)


class QuotationListItem(BaseModel):
    id: str
    quotation_number: str
    order_id: Optional[str] = None
    recipient_name: str
    recipient_email: str
    organization: Optional[str] = None
    country: str
    status: str
    valid_until: datetime
    currency: str
    total_amount: float
    created_at: datetime
    items_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class QuotationDetailResponse(BaseModel):
    id: str
    quotation_number: str
    order_id: Optional[str] = None
    recipient_name: str
    recipient_email: str
    organization: Optional[str] = None
    country: str
    status: str
    valid_until: datetime
    currency: str
    total_amount: float
    commercial_terms: Optional[str] = None
    created_by_user_id: Optional[str] = None
    created_at: datetime
    items: List[QuotationItemSchema] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedQuotationsResponse(BaseModel):
    items: List[QuotationListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class CreateQuotationRequest(BaseModel):
    order_id: Optional[str] = None
    recipient_name: str = Field(..., min_length=2, max_length=255)
    recipient_email: EmailStr
    organization: Optional[str] = Field(None, max_length=255)
    country: str = Field(..., min_length=2, max_length=100)
    valid_days: int = Field(30, ge=1, le=180)
    currency: str = Field("USD", min_length=3, max_length=10)
    commercial_terms: Optional[str] = None
    items: List[QuotationItemCreate] = Field(..., min_length=1)


class UpdateQuotationStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(Draft|Sent|Accepted|Expired|Declined)$")


class UpdateQuotationRequest(BaseModel):
    recipient_name: Optional[str] = Field(None, min_length=2, max_length=255)
    recipient_email: Optional[EmailStr] = None
    organization: Optional[str] = Field(None, max_length=255)
    country: Optional[str] = Field(None, min_length=2, max_length=100)
    valid_days: Optional[int] = Field(None, ge=1, le=180)
    currency: Optional[str] = Field(None, min_length=3, max_length=10)
    commercial_terms: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None



# --- Endpoints ---

@router.get("", response_model=PaginatedQuotationsResponse)
async def list_quotations(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search quotation number, recipient name, email or org"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by quotation status"),
    order_id: Optional[str] = Query(None, description="Filter by linked order ID"),
    current_user: User = Depends(require_permission("quotations.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated commercial quotations."""
    query = select(Quotation)

    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Quotation.quotation_number).like(search_fmt),
                func.lower(Quotation.recipient_name).like(search_fmt),
                func.lower(Quotation.recipient_email).like(search_fmt),
                func.lower(Quotation.organization).like(search_fmt),
            )
        )

    if status_filter and status_filter.lower() != "all":
        query = query.where(func.lower(Quotation.status) == status_filter.strip().lower())

    if order_id:
        query = query.where(Quotation.order_id == order_id)

    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    offset = (page - 1) * limit
    paged_query = query.order_by(Quotation.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(paged_query)
    quotations = res.scalars().all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    items_output = [
        QuotationListItem(
            id=q.id,
            quotation_number=q.quotation_number,
            order_id=q.order_id,
            recipient_name=q.recipient_name,
            recipient_email=q.recipient_email,
            organization=q.organization,
            country=q.country,
            status=q.status,
            valid_until=q.valid_until,
            currency=q.currency,
            total_amount=q.total_amount,
            created_at=q.created_at,
            items_count=len(q.items) if q.items else 0,
        )
        for q in quotations
    ]

    return PaginatedQuotationsResponse(
        items=items_output,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{quotation_id}", response_model=QuotationDetailResponse)
async def get_quotation_details(
    quotation_id: str,
    current_user: User = Depends(require_permission("quotations.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full quotation line item breakdown and commercial terms."""
    stmt = select(Quotation).where(Quotation.id == quotation_id)
    res = await db.execute(stmt)
    quotation = res.scalar_one_or_none()

    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    return QuotationDetailResponse(
        id=quotation.id,
        quotation_number=quotation.quotation_number,
        order_id=quotation.order_id,
        recipient_name=quotation.recipient_name,
        recipient_email=quotation.recipient_email,
        organization=quotation.organization,
        country=quotation.country,
        status=quotation.status,
        valid_until=quotation.valid_until,
        currency=quotation.currency,
        total_amount=quotation.total_amount,
        commercial_terms=quotation.commercial_terms,
        created_by_user_id=quotation.created_by_user_id,
        created_at=quotation.created_at,
        items=[QuotationItemSchema.model_validate(i) for i in (quotation.items or [])],
    )


@router.post("", response_model=QuotationDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    payload: CreateQuotationRequest,
    current_user: User = Depends(require_permission("quotations.create")),
    db: AsyncSession = Depends(get_db),
):
    """Generate a formal pharmaceutical commercial quotation with calculated batch pricing."""
    # Generate quotation number
    random_suffix = str(uuid.uuid4().int)[:4]
    current_year = datetime.now().year
    quotation_number = f"QT-{current_year}-{random_suffix}"

    valid_until = utc_now() + timedelta(days=payload.valid_days)

    total_amount = sum(item.quantity * item.unit_price for item in payload.items)

    quotation = Quotation(
        quotation_number=quotation_number,
        order_id=payload.order_id,
        recipient_name=payload.recipient_name.strip(),
        recipient_email=payload.recipient_email.strip().lower(),
        organization=payload.organization.strip() if payload.organization else None,
        country=payload.country.strip(),
        status="Draft",
        valid_until=valid_until,
        currency=payload.currency.strip().upper(),
        total_amount=round(total_amount, 2),
        commercial_terms=payload.commercial_terms.strip() if payload.commercial_terms else None,
        created_by_user_id=current_user.id,
        created_at=utc_now(),
    )
    db.add(quotation)
    await db.flush()

    for item in payload.items:
        line_total = round(item.quantity * item.unit_price, 2)
        q_item = QuotationItem(
            quotation_id=quotation.id,
            product_id=item.product_id,
            product_name=item.product_name.strip(),
            sku=item.sku.strip().upper(),
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=line_total,
        )
        db.add(q_item)

    # If linked to an order, optionally advance order status to Quotation Sent
    if payload.order_id:
        o_stmt = select(Order).where(Order.id == payload.order_id)
        o_res = await db.execute(o_stmt)
        order = o_res.scalar_one_or_none()
        if order and order.status in ("Submitted", "In Review"):
            order.status = "Quotation Sent"
            order.updated_at = utc_now()

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="QUOTATION_CREATED",
        description=f"Quotation {quotation.quotation_number} generated for {quotation.recipient_name} ({payload.currency} {total_amount:.2f}) by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(quotation)

    return await get_quotation_details(quotation_id=quotation.id, current_user=current_user, db=db)


@router.patch("/{quotation_id}/status", response_model=QuotationDetailResponse)
async def update_quotation_status(
    quotation_id: str,
    payload: UpdateQuotationStatusRequest,
    current_user: User = Depends(require_permission("quotations.approve")),
    db: AsyncSession = Depends(get_db),
):
    """Transition quotation status (e.g. Draft -> Sent -> Accepted)."""
    stmt = select(Quotation).where(Quotation.id == quotation_id)
    res = await db.execute(stmt)
    quotation = res.scalar_one_or_none()

    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    prev_status = quotation.status
    if prev_status == payload.status:
        return await get_quotation_details(quotation_id=quotation.id, current_user=current_user, db=db)

    allowed_next = QUOTATION_STATE_TRANSITIONS.get(prev_status, [])
    if payload.status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Illegal transition from '{prev_status}' to '{payload.status}'. Allowed transitions: {', '.join(allowed_next) or 'None (Terminal state)'}",
        )

    quotation.status = payload.status

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="QUOTATION_STATUS_CHANGED",
        description=f"Quotation {quotation.quotation_number} transitioned from {prev_status} to {payload.status} by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(quotation)

    return await get_quotation_details(quotation_id=quotation.id, current_user=current_user, db=db)


@router.patch("/{quotation_id}", response_model=QuotationDetailResponse)
async def update_quotation(
    quotation_id: str,
    payload: UpdateQuotationRequest,
    current_user: User = Depends(require_permission("quotations.update")),
    db: AsyncSession = Depends(get_db),
):
    """Edit draft quotation specifications. Finalized quotations (Sent/Accepted/Declined) cannot be modified."""
    stmt = select(Quotation).where(Quotation.id == quotation_id)
    res = await db.execute(stmt)
    quotation = res.scalar_one_or_none()

    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    if quotation.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only Draft quotations can be modified. Quotation '{quotation.quotation_number}' is '{quotation.status}'.",
        )

    if payload.recipient_name is not None:
        quotation.recipient_name = payload.recipient_name.strip()
    if payload.recipient_email is not None:
        quotation.recipient_email = payload.recipient_email.strip().lower()
    if payload.organization is not None:
        quotation.organization = payload.organization.strip() or None
    if payload.country is not None:
        quotation.country = payload.country.strip()
    if payload.currency is not None:
        quotation.currency = payload.currency.strip().upper()
    if payload.commercial_terms is not None:
        quotation.commercial_terms = payload.commercial_terms.strip() or None
    if payload.valid_days is not None:
        quotation.valid_until = utc_now() + timedelta(days=payload.valid_days)

    if payload.items is not None:
        # Delete old items and insert updated items with backend recalculation
        for old_item in quotation.items:
            await db.delete(old_item)
        await db.flush()

        total_amount = 0.0
        for item in payload.items:
            line_total = round(item.quantity * item.unit_price, 2)
            total_amount += line_total
            q_item = QuotationItem(
                quotation_id=quotation.id,
                product_id=item.product_id,
                product_name=item.product_name.strip(),
                sku=item.sku.strip().upper(),
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=line_total,
            )
            db.add(q_item)

        quotation.total_amount = round(total_amount, 2)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="QUOTATION_UPDATED",
        description=f"Draft quotation {quotation.quotation_number} updated by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(quotation)
    return await get_quotation_details(quotation_id=quotation.id, current_user=current_user, db=db)

