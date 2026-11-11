from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.core.dependencies.auth import get_current_user
from app.core.security.passwords import hash_password, verify_password
from app.core.security.tokens import (
    create_access_token,
    generate_secure_token,
    hash_token,
)
from app.database.models import (
    AuditEvent,
    Inquiry,
    Order,
    Quotation,
    User,
    UserSession,
    utc_now,
)
from app.database.session import get_db
from app.schemas.auth import (
    MessageResponse,
    PasswordChangeRequest,
    TokenResponse,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Register a new customer, distributor, or partner account."""
    # Check duplicate email
    stmt = select(User).where(User.email == payload.email.lower().strip())
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Create user
    new_user = User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="customer",  # Public registration never grants admin role
        account_type=payload.account_type,
        phone=payload.phone.strip() if payload.phone else None,
        country=payload.country.strip() if payload.country else None,
        company_name=payload.company_name.strip() if payload.company_name else None,
        business_address=payload.business_address.strip() if payload.business_address else None,
        is_active=True,
        is_verified=False,
        created_at=utc_now(),
    )
    db.add(new_user)

    # Audit log
    audit_event = AuditEvent(
        user_id=new_user.id,
        event_type="USER_REGISTERED",
        description=f"New account registered: {new_user.email} ({new_user.account_type})",
        ip_address=request.client.host if request.client else None,
        created_at=utc_now(),
    )
    db.add(audit_event)

    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user, return short-lived access token, and establish rotating session."""
    email_clean = payload.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        # Audit failed login
        audit_event = AuditEvent(
            user_id=user.id if user else None,
            event_type="LOGIN_FAILED",
            description=f"Failed login attempt for: {email_clean}",
            ip_address=request.client.host if request.client else None,
            created_at=utc_now(),
        )
        db.add(audit_event)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended. Please contact platform support.",
        )

    # Create JWT access token
    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
    })

    # Create secure refresh token and session
    raw_refresh = generate_secure_token(48)
    refresh_hash = hash_token(raw_refresh)
    session_days = settings.REFRESH_TOKEN_EXPIRE_DAYS if payload.remember_me else 1
    session_expiry = utc_now() + timedelta(days=session_days)

    user_session = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        user_agent=request.headers.get("user-agent", "Unknown"),
        ip_address=request.client.host if request.client else None,
        expires_at=session_expiry,
        created_at=utc_now(),
    )
    db.add(user_session)

    # Update last login timestamp
    user.last_login_at = utc_now()

    # Audit success
    audit_event = AuditEvent(
        user_id=user.id,
        event_type="LOGIN_SUCCESS",
        description=f"User {user.email} authenticated successfully as {user.role}.",
        ip_address=request.client.host if request.client else None,
        created_at=utc_now(),
    )
    db.add(audit_event)
    await db.commit()

    # Set secure HttpOnly refresh cookie
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=raw_refresh,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=session_days * 86400,
        path="/",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Retrieve current authenticated user profile."""
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Rotate refresh token and issue fresh access token."""
    raw_refresh = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session refresh cookie missing.",
        )

    current_hash = hash_token(raw_refresh)
    stmt = select(UserSession).where(
        UserSession.refresh_token_hash == current_hash,
        UserSession.revoked_at.is_(None),
    )
    result = await db.execute(stmt)
    active_session = result.scalar_one_or_none()

    if not active_session:
        # Potential reuse or invalid session; clear cookie
        response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh session.",
        )

    if active_session.expires_at < utc_now():
        response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session has expired.",
        )

    # Fetch user
    u_stmt = select(User).where(User.id == active_session.user_id)
    u_result = await db.execute(u_stmt)
    user = u_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with session is no longer active.",
        )

    # Rotate refresh token: revoke current, issue new
    active_session.revoked_at = utc_now()

    new_raw_refresh = generate_secure_token(48)
    new_hash = hash_token(new_raw_refresh)
    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=new_hash,
        user_agent=request.headers.get("user-agent", "Unknown"),
        ip_address=request.client.host if request.client else None,
        expires_at=utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        created_at=utc_now(),
    )
    db.add(new_session)
    await db.commit()

    # Issue new access token
    new_access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
    })

    # Set new cookie
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=new_raw_refresh,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Revoke current active refresh session and clear authentication cookies."""
    raw_refresh = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if raw_refresh:
        current_hash = hash_token(raw_refresh)
        stmt = (
            update(UserSession)
            .where(UserSession.refresh_token_hash == current_hash)
            .values(revoked_at=utc_now())
        )
        await db.execute(stmt)
        await db.commit()

    response.delete_cookie(key=settings.AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key="prime_access_token", path="/")

    return MessageResponse(message="Successfully signed out of session.")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all active sessions for current user across all devices."""
    stmt = (
        update(UserSession)
        .where(UserSession.user_id == current_user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=utc_now())
    )
    await db.execute(stmt)

    audit_event = AuditEvent(
        user_id=current_user.id,
        event_type="LOGOUT_ALL",
        description=f"User {current_user.email} terminated all active device sessions.",
        created_at=utc_now(),
    )
    db.add(audit_event)
    await db.commit()

    response.delete_cookie(key=settings.AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key="prime_access_token", path="/")

    return MessageResponse(message="All active sessions have been successfully terminated.")


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile and company details."""
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    if payload.country is not None:
        current_user.country = payload.country.strip()
    if payload.company_name is not None:
        current_user.company_name = payload.company_name.strip()
    if payload.business_address is not None:
        current_user.business_address = payload.business_address.strip()

    audit_event = AuditEvent(
        user_id=current_user.id,
        event_type="PROFILE_UPDATED",
        description=f"User {current_user.email} updated profile.",
        created_at=utc_now(),
    )
    db.add(audit_event)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password with strict verification."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    audit_event = AuditEvent(
        user_id=current_user.id,
        event_type="PASSWORD_CHANGED",
        description=f"Password updated for {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_event)
    await db.commit()
    return MessageResponse(message="Password successfully updated.")


@router.get("/customer/enquiries")
async def get_customer_enquiries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve enquiries belonging to the authenticated customer (tenant isolation)."""
    stmt = (
        select(Inquiry)
        .where(Inquiry.email == current_user.email)
        .order_by(Inquiry.created_at.desc())
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    return [
        {
            "id": inq.id,
            "reference_id": inq.reference_id,
            "email": inq.email,
            "subject": inq.subject,
            "enquiry_type": inq.enquiry_type,
            "status": inq.status,
            "created_at": inq.created_at,
            "message": inq.message,
        }
        for inq in items
    ]


@router.get("/customer/orders")
async def get_customer_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve orders belonging to the authenticated customer (tenant isolation)."""
    stmt = (
        select(Order)
        .where(Order.customer_email == current_user.email)
        .order_by(Order.created_at.desc())
    )
    res = await db.execute(stmt)
    orders = res.scalars().all()
    return [
        {
            "id": o.id,
            "order_number": o.order_number,
            "customer_email": o.customer_email,
            "status": o.status,
            "total_estimated_amount": o.total_estimated_amount,
            "delivery_terms": o.delivery_terms,
            "created_at": o.created_at,
            "items_count": len(o.items) if o.items else 0,
        }
        for o in orders
    ]


@router.get("/customer/quotations")
async def get_customer_quotations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve quotations addressed to the authenticated customer (tenant isolation)."""
    stmt = (
        select(Quotation)
        .where(Quotation.recipient_email == current_user.email)
        .order_by(Quotation.created_at.desc())
    )
    res = await db.execute(stmt)
    quotes = res.scalars().all()
    return [
        {
            "id": q.id,
            "quotation_number": q.quotation_number,
            "recipient_email": q.recipient_email,
            "status": q.status,
            "currency": q.currency,
            "total_amount": q.total_amount,
            "valid_until": q.valid_until,
            "commercial_terms": q.commercial_terms,
            "created_at": q.created_at,
            "items_count": len(q.items) if q.items else 0,
        }
        for q in quotes
    ]


