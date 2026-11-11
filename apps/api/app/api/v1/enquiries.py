import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc

from app.database.session import get_db
from app.database.models import Inquiry, User, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

router = APIRouter(tags=["Enquiries"])


# --- Schemas ---

class InquiryCreateRequest(BaseModel):
    reference_id: Optional[str] = Field(default=None, alias="referenceId")
    full_name: str = Field(alias="fullName")
    email: str
    phone: Optional[str] = None
    country: str = "Tanzania"
    organization: Optional[str] = None
    enquiry_type: str = Field(default="General Enquiry", alias="enquiryType")
    subject: str = "General Commercial Inquiry"
    message: str

    model_config = {
        "populate_by_name": True,
    }


class InquiryListItem(BaseModel):
    id: str
    reference_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    country: str
    organization: Optional[str] = None
    enquiry_type: str
    subject: str
    status: str
    assigned_admin_id: Optional[str] = None
    assigned_admin_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EnquiryDetailResponse(InquiryListItem):
    message: str
    internal_notes: Optional[str] = None


class PaginatedEnquiriesResponse(BaseModel):
    items: List[InquiryListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class UpdateEnquiryRequest(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Pending|Reviewing|Quoted|Resolved|Closed)$")
    assigned_admin_id: Optional[str] = None
    internal_notes: Optional[str] = None


# --- Public Submission Endpoint ---

@router.post("/enquiries", status_code=status.HTTP_201_CREATED)
async def submit_public_enquiry(
    payload: InquiryCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public customer enquiry submission strictly persisted to database."""
    ref_id = payload.reference_id or f"PRM-INQ-{uuid.uuid4().hex[:8].upper()}"
    inquiry = Inquiry(
        reference_id=ref_id,
        full_name=payload.full_name,
        email=payload.email.lower().strip(),
        phone=payload.phone.strip() if payload.phone else None,
        country=payload.country.strip(),
        organization=payload.organization.strip() if payload.organization else None,
        enquiry_type=payload.enquiry_type,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        status="Pending",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(inquiry)

    audit_event = AuditEvent(
        user_id=None,
        event_type="INQUIRY_CREATED",
        description=f"Commercial inquiry logged: {inquiry.reference_id} ({inquiry.enquiry_type}) by {inquiry.full_name}",
        resource_type="inquiry",
        resource_id=inquiry.reference_id,
        created_at=utc_now(),
    )
    db.add(audit_event)

    await db.commit()
    return {
        "success": True,
        "referenceId": inquiry.reference_id,
        "reference_id": inquiry.reference_id,
        "email": inquiry.email,
        "status": inquiry.status,
    }


# --- Admin Enquiry Management ---

@router.get("/admin/enquiries", response_model=PaginatedEnquiriesResponse)
async def list_admin_enquiries(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_admin: User = Depends(require_permission("inquiries.read")),
    db: AsyncSession = Depends(get_db),
):
    """List commercial enquiries with multi-field search and lifecycle filtering."""
    query = select(Inquiry)

    if search:
        s_fmt = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Inquiry.full_name).like(s_fmt),
                func.lower(Inquiry.email).like(s_fmt),
                func.lower(Inquiry.reference_id).like(s_fmt),
                func.lower(Inquiry.organization).like(s_fmt),
                func.lower(Inquiry.subject).like(s_fmt),
            )
        )

    if status_filter and status_filter.lower() != "all":
        query = query.where(Inquiry.status == status_filter)

    # Count
    count_stmt = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    paged_query = query.order_by(desc(Inquiry.created_at)).offset(offset).limit(limit)
    items_res = await db.execute(paged_query)
    inquiries = items_res.scalars().all()

    # Admin name lookups
    admin_ids = [inq.assigned_admin_id for inq in inquiries if inq.assigned_admin_id]
    admin_name_map = {}
    if admin_ids:
        admins_stmt = select(User.id, User.full_name).where(User.id.in_(admin_ids))
        admins_res = await db.execute(admins_stmt)
        admin_name_map = dict(admins_res.all())

    items = []
    for inq in inquiries:
        items.append(
            InquiryListItem(
                id=inq.id,
                reference_id=inq.reference_id,
                full_name=inq.full_name,
                email=inq.email,
                phone=inq.phone,
                country=inq.country,
                organization=inq.organization,
                enquiry_type=inq.enquiry_type,
                subject=inq.subject,
                status=inq.status,
                assigned_admin_id=inq.assigned_admin_id,
                assigned_admin_name=admin_name_map.get(inq.assigned_admin_id),
                created_at=inq.created_at,
                updated_at=inq.updated_at,
            )
        )

    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedEnquiriesResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/admin/enquiries/{enquiry_id}", response_model=EnquiryDetailResponse)
async def get_enquiry_detail(
    enquiry_id: str,
    current_admin: User = Depends(require_permission("inquiries.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full commercial inquiry specifications and internal notes."""
    stmt = select(Inquiry).where(Inquiry.id == enquiry_id)
    res = await db.execute(stmt)
    inq = res.scalar_one_or_none()
    if not inq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry record not found.")

    admin_name = None
    if inq.assigned_admin_id:
        a_stmt = select(User.full_name).where(User.id == inq.assigned_admin_id)
        admin_name = await db.scalar(a_stmt)

    return EnquiryDetailResponse(
        id=inq.id,
        reference_id=inq.reference_id,
        full_name=inq.full_name,
        email=inq.email,
        phone=inq.phone,
        country=inq.country,
        organization=inq.organization,
        enquiry_type=inq.enquiry_type,
        subject=inq.subject,
        message=inq.message,
        status=inq.status,
        assigned_admin_id=inq.assigned_admin_id,
        assigned_admin_name=admin_name,
        internal_notes=inq.internal_notes,
        created_at=inq.created_at,
        updated_at=inq.updated_at,
    )


@router.patch("/admin/enquiries/{enquiry_id}", response_model=EnquiryDetailResponse)
async def update_enquiry(
    enquiry_id: str,
    payload: UpdateEnquiryRequest,
    current_admin: User = Depends(require_permission("inquiries.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Update commercial inquiry status, assign desk administrator, or add internal notes."""
    stmt = select(Inquiry).where(Inquiry.id == enquiry_id)
    res = await db.execute(stmt)
    inq = res.scalar_one_or_none()
    if not inq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry record not found.")

    changes = []
    if payload.status is not None and payload.status != inq.status:
        changes.append(f"status: '{inq.status}' -> '{payload.status}'")
        inq.status = payload.status

    if payload.assigned_admin_id is not None:
        if payload.assigned_admin_id:
            # Verify assigned user exists
            admin_check = await db.scalar(select(User.id).where(User.id == payload.assigned_admin_id))
            if not admin_check:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned administrator not found.")
        changes.append(f"assigned_admin: '{payload.assigned_admin_id}'")
        inq.assigned_admin_id = payload.assigned_admin_id or None

    if payload.internal_notes is not None:
        inq.internal_notes = payload.internal_notes.strip() or None
        changes.append("internal_notes updated")

    inq.updated_at = utc_now()

    if changes:
        audit_event = AuditEvent(
            user_id=current_admin.id,
            event_type="INQUIRY_UPDATED",
            description=f"Inquiry {inq.reference_id} updated: {', '.join(changes)} by {current_admin.email}",
            resource_type="inquiry",
            resource_id=inq.reference_id,
            created_at=utc_now(),
        )
        db.add(audit_event)

    await db.commit()
    await db.refresh(inq)
    return await get_enquiry_detail(enquiry_id=inq.id, current_admin=current_admin, db=db)
