from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    account_type: str = Field(default="Individual Customer")
    phone: str | None = None
    company_name: str | None = None
    business_address: str | None = None
    country: str | None = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = Field(default=False)


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=50)
    country: str | None = Field(None, max_length=100)
    company_name: str | None = Field(None, max_length=255)
    business_address: str | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    account_type: str
    phone: str | None = None
    country: str | None = None
    company_name: str | None = None
    business_address: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
    success: bool = True


# Dashboard Schemas
class UsersMetric(BaseModel):
    total: int
    active: int
    newly_registered: int


class ProductsMetric(BaseModel):
    total: int
    published: int
    drafts: int


class InquiriesMetric(BaseModel):
    total: int
    pending: int
    reviewed: int
    processed: int


class ActivityEventItem(BaseModel):
    id: str
    event_type: str
    description: str
    timestamp: datetime


class RecentInquiryItem(BaseModel):
    id: str
    reference_id: str
    full_name: str
    organization: str | None = None
    enquiry_type: str
    subject: str
    status: str
    created_at: datetime


class OrdersMetric(BaseModel):
    total: int
    pending: int
    confirmed: int
    in_production: int


class QuotationsMetric(BaseModel):
    total: int
    draft: int
    sent: int
    accepted: int
    total_pipeline_value: float


class DashboardSummaryResponse(BaseModel):
    users: UsersMetric
    products: ProductsMetric
    inquiries: InquiriesMetric
    orders: OrdersMetric
    quotations: QuotationsMetric
    recent_activity: list[ActivityEventItem]
    recent_inquiries: list[RecentInquiryItem]
    system_timestamp: datetime
