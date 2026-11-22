# B00 — API Endpoint Inventory & Specifications

**Project:** PRIME by Activist — Unified Enterprise Platform  
**Scope:** Complete Backend REST API Inventory  
**Total Endpoint Routes:** 48 unique paths / 60 operations  
**Framework:** FastAPI 0.115+  
**Specification Version:** OpenAPI 3.1.0  
**Audit Baseline Date:** 2026-11-12  

---

## 1. Authentication & Customer Portal (`app/api/v1/auth.py`)

All endpoints in this group are prefixed with `/api/v1/auth`.

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | None (Public) | `RegisterRequest` (email, password, full_name, etc.) | `AuthResponse` (`201 Created`) | Self-service customer registration. Consumed by `/register`. |
| `POST` | `/api/v1/auth/login` | None (Rate limited, Lockout) | `LoginRequest` (email, password, remember_me) | `TokenResponse` (`200 OK`) + Set-Cookie | Email & password authentication. Consumed by `/login`. |
| `POST` | `/api/v1/auth/refresh` | Cookie / Body Refresh Token | Optional `RefreshTokenRequest` | `TokenResponse` (`200 OK`) + Rotated Cookie | Rotates refresh token & issues new access token. Consumed by API client interceptor. |
| `GET` | `/api/v1/auth/me` | `get_current_user` (Bearer / Cookie) | None | `UserMeResponse` (`200 OK`) | Returns current authenticated user record with permissions. Consumed by `authStore`. |
| `POST` | `/api/v1/auth/logout` | `get_current_user` | None | `MessageResponse` (`200 OK`) + Clear-Cookie | Revokes single active user session. Consumed by header sign-out. |
| `POST` | `/api/v1/auth/logout-all` | `get_current_user` | None | `MessageResponse` (`200 OK`) | Increments `token_version`, revokes all active family sessions. Consumed by security settings. |
| `PATCH` | `/api/v1/auth/profile` | `get_current_user` | `UpdateProfileRequest` (full_name, phone, etc.) | `UserMeResponse` (`200 OK`) | Self-service profile information updates. Consumed by customer account settings. |
| `POST` | `/api/v1/auth/change-password` | `get_current_user` | `ChangePasswordRequest` (current, new) | `MessageResponse` (`200 OK`) | Verifies current password and updates hash. Consumed by security settings. |
| `GET` | `/api/v1/auth/customer/orders` | `get_current_user` | `page`, `limit`, `status` | `PaginatedCustomerOrders` (`200 OK`) | Lists orders belonging strictly to `current_user.id` (IDOR safe). Consumed by Customer Portal. |
| `GET` | `/api/v1/auth/customer/orders/{order_id}` | `get_current_user` | `order_id` (Path) | `CustomerOrderDetail` (`200 OK` or `404`) | Retrieves specific customer order (verified by customer_id). Consumed by Customer Portal. |
| `GET` | `/api/v1/auth/customer/quotations` | `get_current_user` | `page`, `limit`, `status` | `PaginatedCustomerQuotations` (`200 OK`) | Lists quotations issued to `current_user.id` (IDOR safe). Consumed by Customer Portal. |
| `GET` | `/api/v1/auth/customer/quotations/{quotation_id}` | `get_current_user` | `quotation_id` (Path) | `CustomerQuotationDetail` (`200 OK` or `404`) | Retrieves quotation detail (verified by customer_id). Consumed by Customer Portal. |
| `GET` | `/api/v1/auth/customer/enquiries` | `get_current_user` | `page`, `limit` | `PaginatedCustomerEnquiries` (`200 OK`) | Lists commercial inquiries submitted by caller. Consumed by Customer Portal. |
| `GET` | `/api/v1/auth/customer/enquiries/{enquiry_id}` | `get_current_user` | `enquiry_id` (Path) | `CustomerEnquiryDetail` (`200 OK` or `404`) | Retrieves customer inquiry detail. Consumed by Customer Portal. |

---

## 2. Product Catalogue & Formulations (`app/api/v1/products.py` & `categories.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | None (Public) | None | `list[CategorySchema]` (`200 OK`) | Lists active product categories with display order. Consumed by `/products`, Navbar. |
| `GET` | `/api/v1/products` | None (Public) | `category`, `search` | `list[ProductItemSchema]` (`200 OK`) | Public catalog of published formulations. Consumed by `/products`. |
| `GET` | `/api/v1/admin/products` | `require_permission("products.read")` | `page`, `limit`, `search`, `category`, `status` | `PaginatedProductsResponse` (`200 OK`) | Admin product listing including Draft and Archived items. Consumed by `/admin/products`. |
| `POST` | `/api/v1/admin/products` | `require_permission("products.create")` | `ProductCreateRequest` | `ProductItemSchema` (`201 Created`) | Registers a new formulation with SKU and specifications. Consumed by `/admin/products`. |
| `GET` | `/api/v1/admin/products/{product_id}` | `require_permission("products.read")` | `product_id` (Path) | `ProductItemSchema` (`200 OK` or `404`) | Admin product details with attached regulatory documents. Consumed by `/admin/products/[id]`. |
| `PATCH` | `/api/v1/admin/products/{product_id}` | `require_permission("products.update")` | `ProductUpdateRequest` | `ProductItemSchema` (`200 OK`) | Updates technical formulation specifications. Consumed by `/admin/products`. |
| `DELETE` | `/api/v1/admin/products/{product_id}` | `require_permission("products.delete")` | `product_id` (Path) | `MessageResponse` (`200 OK`) | Deletes an unlinked product formulation. Consumed by `/admin/products`. |
| `POST` | `/api/v1/admin/products/{product_id}/publish` | `require_permission("products.publish")` | `product_id` (Path) | `ProductItemSchema` (`200 OK`) | Transitions status to Published and activates public visibility. Consumed by `/admin/products`. |
| `POST` | `/api/v1/admin/products/{product_id}/archive` | `require_permission("products.publish")` | `product_id` (Path) | `ProductItemSchema` (`200 OK`) | Transitions status to Archived and removes from public catalog. Consumed by `/admin/products`. |
| `POST` | `/api/v1/admin/products/{product_id}/documents` | `require_permission("products.update")` | `ProductDocumentCreate` (title, type, path) | `ProductDocumentSchema` (`201 Created`) | Attaches technical dossier or COA metadata to a product. Consumed by `/admin/products`. |
| `DELETE` | `/api/v1/admin/products/{product_id}/documents/{document_id}` | `require_permission("products.update")` | `product_id`, `document_id` (Path) | `MessageResponse` (`200 OK`) | Unlinks and deletes attached product dossier. Consumed by `/admin/products`. |

---

## 3. Commercial Enquiries & CRM (`app/api/v1/enquiries.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/enquiries` | None (Rate limited: 10/min) | `InquiryCreateRequest` (full_name, email, message, etc.) | `InquirySubmitResponse` (`201 Created`) | Public inquiry submission from contact page. Consumed by `/contact`. |
| `GET` | `/api/v1/admin/enquiries` | `require_permission("inquiries.read")` | `page`, `limit`, `search`, `status`, `assigned_admin_id` | `PaginatedEnquiriesResponse` (`200 OK`) | Lists customer commercial inquiries with pagination. Consumed by `/admin/enquiries`. |
| `GET` | `/api/v1/admin/enquiries/{enquiry_id}` | `require_permission("inquiries.read")` | `enquiry_id` (Path) | `EnquiryDetailResponse` (`200 OK` or `404`) | Full message body and internal notes of an inquiry. Consumed by `/admin/enquiries`. |
| `PATCH` | `/api/v1/admin/enquiries/{enquiry_id}` | `require_permission("inquiries.manage")` | `UpdateEnquiryRequest` (status, admin, notes) | `EnquiryDetailResponse` (`200 OK`) | Assigns admin, logs internal notes, transitions status. Consumed by `/admin/enquiries`. |

---

## 4. B2B Orders & Procurement Lifecycle (`app/api/v1/orders.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/orders` | `require_permission("orders.read")` | `page`, `limit`, `search`, `status`, `assigned_admin_id` | `PaginatedOrdersResponse` (`200 OK`) | Lists B2B procurement orders with line item counts. Consumed by `/admin/orders`. |
| `POST` | `/api/v1/admin/orders` | `require_permission("orders.update")` | `CreateOrderRequest` (customer, items, delivery_terms) | `OrderDetailResponse` (`201 Created`) | Creates a confirmed B2B order with line items. Consumed by `/admin/orders`. |
| `GET` | `/api/v1/admin/orders/{order_id}` | `require_permission("orders.read")` | `order_id` (Path) | `OrderDetailResponse` (`200 OK` or `404`) | Full order detail with items and status transition audit log. Consumed by `/admin/orders`. |
| `PATCH` | `/api/v1/admin/orders/{order_id}/status` | `require_permission("orders.status")` | `UpdateOrderStatusRequest` (new_status, reason) | `OrderDetailResponse` (`200 OK`) | Validates state machine and logs transition to history. Consumed by `/admin/orders`. |
| `POST` | `/api/v1/admin/orders/{order_id}/assign` | `require_permission("orders.assign")` | `AssignOrderRequest` (assigned_admin_id) | `OrderDetailResponse` (`200 OK`) | Assigns lead administrative handler to the order. Consumed by `/admin/orders`. |

---

## 5. Commercial Quotations & Pricing (`app/api/v1/quotations.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/quotations` | `require_permission("quotations.read")` | `page`, `limit`, `search`, `status` | `PaginatedQuotationsResponse` (`200 OK`) | Lists institutional quotations with valid dates and amounts. Consumed by `/admin/quotations`. |
| `POST` | `/api/v1/admin/quotations` | `require_permission("quotations.create")` | `CreateQuotationRequest` (recipient, items, terms, days) | `QuotationDetailResponse` (`201 Created`) | Generates official commercial quotation with line calculations. Consumed by `/admin/quotations`. |
| `GET` | `/api/v1/admin/quotations/{quotation_id}` | `require_permission("quotations.read")` | `quotation_id` (Path) | `QuotationDetailResponse` (`200 OK` or `404`) | Full quotation breakdown, validity window, and item list. Consumed by `/admin/quotations`. |
| `PATCH` | `/api/v1/admin/quotations/{quotation_id}` | `require_permission("quotations.update")` | `UpdateQuotationRequest` (terms, recipient, items) | `QuotationDetailResponse` (`200 OK`) | Updates commercial terms or line item unit pricing. Consumed by `/admin/quotations`. |
| `PATCH` | `/api/v1/admin/quotations/{quotation_id}/status` | `require_permission("quotations.approve")` | `UpdateQuotationStatusRequest` (new_status) | `QuotationDetailResponse` (`200 OK`) | Transitions quotation through Draft -> Sent -> Accepted/Declined. Consumed by `/admin/quotations`. |

---

## 6. Document Storage & File Management (`app/api/v1/documents.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/documents` | `require_permission("documents.read")` | `page`, `limit`, `category` | `PaginatedDocumentsResponse` (`200 OK`) | Lists uploaded files, MIME types, and storage sizes. Consumed by `/admin/documents`. |
| `POST` | `/api/v1/admin/documents/upload` | `require_permission("documents.upload")` | `UploadFile` (multipart), `category` | `UploadedFileResponse` (`201 Created`) | Validates magic bytes, checks max 10MB, saves as `<uuid>.<ext>`. Consumed by `/admin/documents`. |
| `GET` | `/api/v1/admin/documents/{document_id}/download` | `require_permission("documents.read")` | `document_id` (Path) | Binary File Stream (`FileResponse`) | Streams document with original filename in `Content-Disposition`. Consumed by `/admin/documents`. |

---

## 7. Administrative Users & RBAC Security (`app/api/v1/users.py` & `roles.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/users` | `require_permission("users.read")` | `page`, `limit`, `search`, `role`, `status` | `PaginatedUsersResponse` (`200 OK`) | Paginated user accounts with status and role indicators. Consumed by `/admin/users`. |
| `GET` | `/api/v1/admin/users/{user_id}` | `require_permission("users.read")` | `user_id` (Path) | `UserDetailResponse` (`200 OK` or `404`) | Full user profile, active sessions, and assigned role objects. Consumed by `/admin/users`. |
| `PATCH` | `/api/v1/admin/users/{user_id}` | `require_permission("users.update")` | `UpdateUserRequest` (role, account_type, etc.) | `UserDetailResponse` (`200 OK`) | Updates account attributes. Blocks privilege escalation above caller. Consumed by `/admin/users`. |
| `POST` | `/api/v1/admin/users/{user_id}/suspend` | `require_permission("users.suspend")` | `SuspendUserRequest` (reason) | `UserStatusResponse` (`200 OK`) | Disables user, increments token_version, and revokes sessions. Consumed by `/admin/users`. |
| `POST` | `/api/v1/admin/users/{user_id}/activate` | `require_permission("users.update")` | None | `UserStatusResponse` (`200 OK`) | Re-enables suspended user account. Consumed by `/admin/users`. |
| `POST` | `/api/v1/admin/users/{user_id}/revoke-sessions` | `require_permission("users.suspend")` | None | `MessageResponse` (`200 OK`) | Revokes all refresh tokens and active access tokens for user. Consumed by `/admin/users`. |
| `GET` | `/api/v1/admin/permissions` | `require_permission("roles.read")` | `module` (Query) | `list[PermissionSchema]` (`200 OK`) | Enumerates 28 system permissions categorized by domain module. Consumed by `/admin/roles`. |
| `GET` | `/api/v1/admin/roles` | `require_permission("roles.read")` | None | `list[RoleDetailSchema]` (`200 OK`) | Lists all custom and system roles with user counts and permissions. Consumed by `/admin/roles`. |
| `POST` | `/api/v1/admin/roles` | `require_permission("roles.manage")` | `CreateRoleRequest` (name, desc, permission_ids) | `RoleDetailSchema` (`201 Created`) | Creates custom role. Blocks granting permissions caller lacks. Consumed by `/admin/roles`. |
| `GET` | `/api/v1/admin/roles/{role_id}` | `require_permission("roles.read")` | `role_id` (Path) | `RoleDetailSchema` (`200 OK` or `404`) | Detailed permissions granted to specific role. Consumed by `/admin/roles`. |
| `PATCH` | `/api/v1/admin/roles/{role_id}` | `require_permission("roles.manage")` | `UpdateRoleRequest` | `RoleDetailSchema` (`200 OK`) | Updates role name, description, and permission assignments. Consumed by `/admin/roles`. |
| `DELETE` | `/api/v1/admin/roles/{role_id}` | `require_permission("roles.manage")` | `role_id` (Path) | `MessageResponse` (`200 OK`) | Removes custom role. Rejects deletion of `is_system=True` roles. Consumed by `/admin/roles`. |

---

## 8. Dashboard, System Settings & Infrastructure Health (`dashboard.py`, `settings.py`, `health.py`)

| Method | Path | Auth Dependency | Request Payload / Params | Response Model & Status | Description & Frontend Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard/summary` | `require_admin_user` | None | `DashboardSummary` (`200 OK`) | Real-time KPI counts, recent activity logs, and pending inquiries. Consumed by `/admin`. |
| `GET` | `/api/v1/admin/settings` | `require_permission("settings.read")` | None | `SettingsResponse` (`200 OK`) | Returns platform configurations grouped by category. Consumed by `/admin/settings`. |
| `PATCH` | `/api/v1/admin/settings` | `require_permission("settings.update")` | `UpdateSettingsRequest` (settings dict) | `SettingsResponse` (`200 OK`) | Persists key-value settings and writes an audit event log. Consumed by `/admin/settings`. |
| `GET` | `/api/v1/health` | None (Public) | None | `HealthStatus` (`200 OK`) | Liveness check reporting version, environment, and uptime. Consumed by monitoring probes. |
| `GET` | `/api/v1/health/ready` | None (Public) | None | `ReadinessStatus` (`200 OK` or `503`) | Readiness probe executing a live `SELECT 1` query against the database. Consumed by container ingress. |
| `GET` | `/health` | None (Public) | None | Dict (`200 OK`) | Root container health check endpoint for Docker / Nginx reverse proxy. |

---

## 9. API Inventory Summary & Gap Analysis

- **48 Routes Fully Operational**: All listed routes match existing frontend API proxy routes (`apps/web/src/app/api/`).
- **Missing Consumer Endpoints**:
  1. `GET /api/v1/products/{product_id}`: Missing public endpoint. Only `/admin/products/{id}` exists.
  2. `POST /api/v1/customer/orders`: Missing customer online order checkout.
  3. `POST /api/v1/customer/quotations/request`: Missing self-service quotation request from cart.
  4. `POST /api/v1/customer/quotations/{id}/accept`: Missing self-service quote acceptance.

