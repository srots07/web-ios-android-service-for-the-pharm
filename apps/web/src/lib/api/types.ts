/**
 * Comprehensive API Types & Schemas
 * PRIME by Activist Enterprise Platform
 */

// --- Base Pagination ---
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// --- Auth Types ---
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "staff" | "customer";
  account_type: string;
  phone?: string | null;
  country?: string | null;
  company_name?: string | null;
  business_address?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string | null;
  roles?: Array<{ id: string; name: string; slug: string; is_system: boolean }>;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  account_type?: string;
  phone?: string;
  country?: string;
  company_name?: string;
  business_address?: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  country?: string;
  company_name?: string;
  business_address?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

// --- Category Types ---
export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  display_order: number;
  created_at: string;
}

// --- Product Types ---
export interface ProductDocumentItem {
  id: string;
  product_id: string;
  title: string;
  document_type: string;
  file_path: string;
  file_size?: number | null;
  created_at: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  product_code?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  composition?: string | null;
  pack_size: string;
  description?: string;
  storage_conditions?: string | null;
  shelf_life?: string | null;
  image_url?: string | null;
  status: "Draft" | "Published" | "Archived" | string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  documents?: ProductDocumentItem[];
}

export interface CreateProductPayload {
  name: string;
  category: string;
  sku: string;
  product_code?: string;
  dosage_form?: string;
  strength?: string;
  composition?: string;
  pack_size: string;
  description?: string;
  storage_conditions?: string;
  shelf_life?: string;
  image_url?: string;
  status?: "Draft" | "Published" | "Archived";
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

// --- Order Types ---
export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  target_pack_size?: string | null;
}

export interface OrderStatusHistoryItem {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  reason?: string | null;
  created_at: string;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  organization?: string | null;
  country: string;
  status: string;
  assigned_admin_id?: string | null;
  total_estimated_amount?: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
}

export interface OrderDetail extends OrderListItem {
  inquiry_id?: string | null;
  assigned_admin_name?: string | null;
  delivery_terms?: string | null;
  internal_notes?: string | null;
  items: OrderItem[];
  status_history: OrderStatusHistoryItem[];
}

// --- Quotation Types ---
export interface QuotationLineItem {
  id?: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface QuotationListItem {
  id: string;
  quotation_number: string;
  order_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  organization?: string | null;
  country: string;
  status: "Draft" | "Sent" | "Accepted" | "Expired" | "Declined" | string;
  valid_until: string;
  currency: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

export interface QuotationDetail extends QuotationListItem {
  commercial_terms?: string | null;
  created_by_user_id?: string | null;
  items: QuotationLineItem[];
}

export interface CreateQuotationPayload {
  order_id?: string;
  recipient_name: string;
  recipient_email: string;
  organization?: string;
  country: string;
  valid_days: number;
  currency: string;
  commercial_terms?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
  }>;
}

// --- Roles & Permissions Types ---
export interface PermissionItem {
  id: string;
  slug: string;
  name: string;
  module: string;
  description: string;
}

export interface RoleDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  created_at: string;
  permissions: PermissionItem[];
  user_count: number;
}

// --- Dashboard Types ---
export interface DashboardSummary {
  users: { total: number; active: number; newly_registered: number };
  products: { total: number; published: number; drafts: number };
  inquiries: { total: number; pending: number; reviewed: number; processed: number };
  orders: { total: number; pending: number; confirmed: number; in_production: number };
  quotations: { total: number; draft: number; sent: number; accepted: number; total_pipeline_value: number };
  recent_activity: Array<{
    id: string;
    event_type: string;
    description: string;
    timestamp: string;
  }>;
  recent_inquiries: Array<{
    id: string;
    reference_id: string;
    full_name: string;
    organization?: string | null;
    enquiry_type: string;
    subject: string;
    status: string;
    created_at: string;
  }>;
  system_timestamp: string;
}

// --- Document Storage Types ---
export interface UploadedFileResponse {
  id: string;
  filename: string;
  stored_filename: string;
  content_type: string;
  file_size: number;
  category: string;
  download_url: string;
  created_at: string;
}

// --- Enquiry Types ---
export interface EnquiryListItem {
  id: string;
  reference_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  country: string;
  organization?: string | null;
  enquiry_type: string;
  subject: string;
  status: string;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface EnquiryDetail extends EnquiryListItem {
  message: string;
  internal_notes?: string | null;
}

export interface UpdateEnquiryPayload {
  status?: string;
  assigned_admin_id?: string;
  internal_notes?: string;
}

// --- Order Creation Payload ---
export interface CreateOrderPayload {
  customer_name: string;
  customer_email: string;
  organization?: string;
  country: string;
  inquiry_id?: string;
  delivery_terms?: string;
  internal_notes?: string;
  total_estimated_amount?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    target_pack_size?: string;
  }>;
}

// --- Settings Types ---
export interface PlatformSettingItem {
  key: string;
  value: string;
  description?: string | null;
  category: string;
  updated_at: string;
  updated_by_user_id?: string | null;
}

export interface SettingsResponse {
  settings: Record<string, string>;
  items: PlatformSettingItem[];
}


