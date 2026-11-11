from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime

from app.database.session import get_db
from app.database.models import Order, OrderItem, OrderStatusHistory, User, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])

VALID_ORDER_STATUSES = [
    "Submitted",
    "In Review",
    "Quotation Sent",
    "Confirmed",
    "In Production",
    "Shipped",
    "Delivered",
    "Cancelled",
]

ORDER_STATE_TRANSITIONS = {
    "Submitted": ["In Review", "Cancelled"],
    "In Review": ["Quotation Sent", "Confirmed", "Cancelled"],
    "Quotation Sent": ["Confirmed", "Cancelled"],
    "Confirmed": ["In Production", "Cancelled"],
    "In Production": ["Shipped", "Cancelled"],
    "Shipped": ["Delivered"],
    "Delivered": [],
    "Cancelled": [],
}


# --- Schemas ---

class OrderItemSchema(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    target_pack_size: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistorySchema(BaseModel):
    id: str
    previous_status: str
    new_status: str
    changed_by: str
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderListItem(BaseModel):
    id: str
    order_number: str
    customer_name: str
    customer_email: str
    organization: Optional[str] = None
    country: str
    status: str
    assigned_admin_id: Optional[str] = None
    total_estimated_amount: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class OrderDetailResponse(BaseModel):
    id: str
    order_number: str
    inquiry_id: Optional[str] = None
    customer_name: str
    customer_email: str
    organization: Optional[str] = None
    country: str
    status: str
    assigned_admin_id: Optional[str] = None
    assigned_admin_name: Optional[str] = None
    total_estimated_amount: Optional[str] = None
    delivery_terms: Optional[str] = None
    internal_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemSchema] = []
    status_history: List[OrderStatusHistorySchema] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedOrdersResponse(BaseModel):
    items: List[OrderListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class OrderStatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = Field(None, max_length=500)


class OrderAssignRequest(BaseModel):
    assigned_admin_id: str


class CreateOrderItemRequest(BaseModel):
    product_id: str
    product_name: str
    sku: str
    quantity: int = Field(..., ge=1)
    target_pack_size: Optional[str] = None


class CreateOrderRequest(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_email: str = Field(..., min_length=5, max_length=255)
    organization: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=100)
    inquiry_id: Optional[str] = None
    delivery_terms: Optional[str] = None
    internal_notes: Optional[str] = None
    total_estimated_amount: Optional[str] = None
    items: List[CreateOrderItemRequest] = Field(..., min_length=1)



# --- Endpoints ---

@router.get("", response_model=PaginatedOrdersResponse)
async def list_orders(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by order number, customer name, email or organization"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by order lifecycle status"),
    assigned_admin_id: Optional[str] = Query(None, description="Filter by assigned administrator ID"),
    current_user: User = Depends(require_permission("orders.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated B2B procurement orders with comprehensive lifecycle filters."""
    query = select(Order)

    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Order.order_number).like(search_fmt),
                func.lower(Order.customer_name).like(search_fmt),
                func.lower(Order.customer_email).like(search_fmt),
                func.lower(Order.organization).like(search_fmt),
            )
        )

    if status_filter and status_filter.lower() != "all":
        query = query.where(func.lower(Order.status) == status_filter.strip().lower())

    if assigned_admin_id:
        query = query.where(Order.assigned_admin_id == assigned_admin_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate and order newest first
    offset = (page - 1) * limit
    paged_query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(paged_query)
    orders = res.scalars().all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    items_output = []
    for o in orders:
        items_output.append(
            OrderListItem(
                id=o.id,
                order_number=o.order_number,
                customer_name=o.customer_name,
                customer_email=o.customer_email,
                organization=o.organization,
                country=o.country,
                status=o.status,
                assigned_admin_id=o.assigned_admin_id,
                total_estimated_amount=o.total_estimated_amount,
                created_at=o.created_at,
                updated_at=o.updated_at,
                items_count=len(o.items) if o.items else 0,
            )
        )

    return PaginatedOrdersResponse(
        items=items_output,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order_details(
    order_id: str,
    current_user: User = Depends(require_permission("orders.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve complete B2B order specifications, line items, and audit transition history."""
    stmt = select(Order).where(Order.id == order_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    assigned_name = None
    if order.assigned_admin_id:
        u_stmt = select(User.full_name).where(User.id == order.assigned_admin_id)
        u_res = await db.execute(u_stmt)
        assigned_name = u_res.scalar_one_or_none()

    return OrderDetailResponse(
        id=order.id,
        order_number=order.order_number,
        inquiry_id=order.inquiry_id,
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        organization=order.organization,
        country=order.country,
        status=order.status,
        assigned_admin_id=order.assigned_admin_id,
        assigned_admin_name=assigned_name,
        total_estimated_amount=order.total_estimated_amount,
        delivery_terms=order.delivery_terms,
        internal_notes=order.internal_notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[OrderItemSchema.model_validate(i) for i in (order.items or [])],
        status_history=[OrderStatusHistorySchema.model_validate(h) for h in (order.status_history or [])],
    )


@router.patch("/{order_id}/status", response_model=OrderDetailResponse)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdateRequest,
    current_user: User = Depends(require_permission("orders.status")),
    db: AsyncSession = Depends(get_db),
):
    """Advance order lifecycle status with mandatory audit log and reason recording."""
    if payload.status not in VALID_ORDER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Valid transitions are: {', '.join(VALID_ORDER_STATUSES)}",
        )

    stmt = select(Order).where(Order.id == order_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    prev_status = order.status
    if prev_status == payload.status:
        return await get_order_details(order_id=order.id, current_user=current_user, db=db)

    allowed_next = ORDER_STATE_TRANSITIONS.get(prev_status, [])
    if payload.status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Illegal workflow transition from '{prev_status}' to '{payload.status}'. Allowed transitions: {', '.join(allowed_next) or 'None (Terminal state)'}",
        )

    order.status = payload.status
    order.updated_at = utc_now()

    # Record history entry
    history = OrderStatusHistory(
        order_id=order.id,
        previous_status=prev_status,
        new_status=payload.status,
        changed_by=current_user.full_name or current_user.email,
        reason=payload.reason or f"Status transitioned to {payload.status}.",
        created_at=utc_now(),
    )
    db.add(history)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="ORDER_STATUS_CHANGED",
        description=f"Order {order.order_number} status changed from {prev_status} to {payload.status} by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(order)

    return await get_order_details(order_id=order.id, current_user=current_user, db=db)


@router.post("/{order_id}/assign", response_model=OrderDetailResponse)
async def assign_order(
    order_id: str,
    payload: OrderAssignRequest,
    current_user: User = Depends(require_permission("orders.assign")),
    db: AsyncSession = Depends(get_db),
):
    """Assign administrative responsibility for an order."""
    stmt = select(Order).where(Order.id == order_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Verify target admin exists
    u_stmt = select(User).where(User.id == payload.assigned_admin_id)
    u_res = await db.execute(u_stmt)
    assigned_user = u_res.scalar_one_or_none()

    if not assigned_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator account not found")

    order.assigned_admin_id = assigned_user.id
    order.updated_at = utc_now()

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="ORDER_ASSIGNED",
        description=f"Order {order.order_number} assigned to {assigned_user.full_name} ({assigned_user.email}) by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()

    return await get_order_details(order_id=order.id, current_user=current_user, db=db)


@router.post("", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: CreateOrderRequest,
    current_user: User = Depends(require_permission("orders.read")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new procurement order with validated line items."""
    order_num = f"PRM-ORD-{uuid.uuid4().hex[:8].upper()}"

    order = Order(
        order_number=order_num,
        inquiry_id=payload.inquiry_id,
        customer_name=payload.customer_name.strip(),
        customer_email=payload.customer_email.lower().strip(),
        organization=payload.organization.strip() if payload.organization else None,
        country=payload.country.strip(),
        status="Submitted",
        delivery_terms=payload.delivery_terms.strip() if payload.delivery_terms else None,
        internal_notes=payload.internal_notes.strip() if payload.internal_notes else None,
        total_estimated_amount=payload.total_estimated_amount or "$0.00",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(order)
    await db.flush()

    for item in payload.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            sku=item.sku,
            quantity=item.quantity,
            target_pack_size=item.target_pack_size,
        )
        db.add(order_item)

    # Initial history
    history = OrderStatusHistory(
        order_id=order.id,
        previous_status="None",
        new_status="Submitted",
        changed_by=current_user.full_name or current_user.email,
        reason="Order initialized and submitted to procurement desk.",
        created_at=utc_now(),
    )
    db.add(history)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="ORDER_CREATED",
        description=f"Order {order.order_number} submitted by {current_user.email} for {order.customer_email}.",
        resource_type="order",
        resource_id=order.order_number,
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(order)
    return await get_order_details(order_id=order.id, current_user=current_user, db=db)


