from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies.auth import require_admin_user
from app.database.models import (
    AuditEvent,
    Inquiry,
    Order,
    ProductItem,
    Quotation,
    User,
    utc_now,
)
from app.database.session import get_db
from app.schemas.auth import (
    ActivityEventItem,
    DashboardSummaryResponse,
    InquiriesMetric,
    OrdersMetric,
    ProductsMetric,
    QuotationsMetric,
    RecentInquiryItem,
    UsersMetric,
)

router = APIRouter(tags=["Admin Dashboard"])


@router.get("/admin/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_admin_dashboard_summary(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate real database metrics, activity logs, and inquiries for the administrative dashboard."""
    now = utc_now()
    thirty_days_ago = now - timedelta(days=30)

    # 1. User Metrics
    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_users = await db.scalar(select(func.count(User.id)).where(User.is_active == True)) or 0
    new_users = await db.scalar(select(func.count(User.id)).where(User.created_at >= thirty_days_ago)) or 0

    # 2. Product Metrics
    total_products = await db.scalar(select(func.count(ProductItem.id))) or 0
    published_products = await db.scalar(select(func.count(ProductItem.id)).where(ProductItem.is_published == True)) or 0
    draft_products = total_products - published_products

    # 3. Inquiry Metrics
    total_inquiries = await db.scalar(select(func.count(Inquiry.id))) or 0
    pending_inquiries = await db.scalar(select(func.count(Inquiry.id)).where(Inquiry.status == "Pending")) or 0
    reviewed_inquiries = await db.scalar(select(func.count(Inquiry.id)).where(Inquiry.status.in_(["Reviewed", "Reviewing"]))) or 0
    processed_inquiries = total_inquiries - pending_inquiries - reviewed_inquiries

    # 4. Order Metrics
    total_orders = await db.scalar(select(func.count(Order.id))) or 0
    pending_orders = await db.scalar(select(func.count(Order.id)).where(Order.status.in_(["Submitted", "In Review"]))) or 0
    confirmed_orders = await db.scalar(select(func.count(Order.id)).where(Order.status == "Confirmed")) or 0
    production_orders = await db.scalar(select(func.count(Order.id)).where(Order.status == "In Production")) or 0

    # 5. Quotation Metrics
    total_quotations = await db.scalar(select(func.count(Quotation.id))) or 0
    draft_quotations = await db.scalar(select(func.count(Quotation.id)).where(Quotation.status == "Draft")) or 0
    sent_quotations = await db.scalar(select(func.count(Quotation.id)).where(Quotation.status == "Sent")) or 0
    accepted_quotations = await db.scalar(select(func.count(Quotation.id)).where(Quotation.status == "Accepted")) or 0
    pipeline_val_res = await db.scalar(select(func.coalesce(func.sum(Quotation.total_amount), 0.0)))
    total_pipeline_value = float(pipeline_val_res or 0.0)

    # 6. Recent Activity
    act_stmt = select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(8)
    act_res = await db.execute(act_stmt)
    audit_events = act_res.scalars().all()

    activity_items = [
        ActivityEventItem(
            id=ev.id,
            event_type=ev.event_type,
            description=ev.description,
            timestamp=ev.created_at,
        )
        for ev in audit_events
    ]

    # 7. Recent Inquiries
    inq_stmt = select(Inquiry).order_by(desc(Inquiry.created_at)).limit(6)
    inq_res = await db.execute(inq_stmt)
    inquiries = inq_res.scalars().all()

    inquiry_items = [
        RecentInquiryItem(
            id=inq.id,
            reference_id=inq.reference_id,
            full_name=inq.full_name,
            organization=inq.organization,
            enquiry_type=inq.enquiry_type,
            subject=inq.subject,
            status=inq.status,
            created_at=inq.created_at,
        )
        for inq in inquiries
    ]

    return DashboardSummaryResponse(
        users=UsersMetric(
            total=total_users,
            active=active_users,
            newly_registered=new_users,
        ),
        products=ProductsMetric(
            total=total_products,
            published=published_products,
            drafts=draft_products,
        ),
        inquiries=InquiriesMetric(
            total=total_inquiries,
            pending=pending_inquiries,
            reviewed=reviewed_inquiries,
            processed=max(0, processed_inquiries),
        ),
        orders=OrdersMetric(
            total=total_orders,
            pending=pending_orders,
            confirmed=confirmed_orders,
            in_production=production_orders,
        ),
        quotations=QuotationsMetric(
            total=total_quotations,
            draft=draft_quotations,
            sent=sent_quotations,
            accepted=accepted_quotations,
            total_pipeline_value=total_pipeline_value,
        ),
        recent_activity=activity_items,
        recent_inquiries=inquiry_items,
        system_timestamp=now,
    )


