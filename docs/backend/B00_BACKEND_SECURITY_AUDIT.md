# B00 — Backend Security & Compliance Audit

**Project:** PRIME by Activist — Unified Enterprise Platform  
**Target:** FastAPI Backend Core Security Controls  
**Audit Scope:** Authentication, Authorization, Cryptography, Network Ingress, Data Isolation  
**Audit Date:** 2026-11-12  
**Security Posture:** **HIGH (Phase 2 Hardened)**  

---

## 1. Authentication & Session Cryptography

### 1.1 Password Hashing Architecture
- **Algorithm:** Argon2id (`v=19`, `m=65536` [64 MiB], `t=3`, `p=4`, salt=16 bytes, keylen=32 bytes).
- **Implementation File:** `apps/api/app/core/security/passwords.py`.
- **Timing Attack Mitigation:** Implements `DUMMY_PASSWORD_HASH` to perform constant-time verification when an unauthenticated caller attempts to log in with an email address not present in the database.
- **Audit Defect:** Uses `passlib.context.CryptContext` wrapper which triggers a Python 3.12 deprecation warning (`Accessing argon2.__version__ is deprecated`).
- **Remediation Target:** Direct invocation of `argon2.PasswordHasher` from `argon2-cffi`.

### 1.2 JWT Access Token Lifecycle
- **Implementation File:** `apps/api/app/core/security/tokens.py`.
- **Library:** `pyjwt[crypto]>=2.9.0` (Migrated from `python-jose`).
- **Algorithm:** HMAC-SHA256 (`HS256`).
- **Token Expiry:** 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Standard Claims Validated:**
  - `iss`: Enforced as `"prime-by-activist-auth"`.
  - `exp`: Explicit expiration enforced by PyJWT.
  - `iat`: Timestamp of token issuance.
  - `sub`: User UUIDv4.
  - `token_version`: Monotonically increasing integer tracking global revocation.
  - `sid`: Unique session identifier matching `user_sessions.id`.

### 1.3 Refresh Token Rotation & Family Reuse Detection
- **Storage:** Stored in `user_sessions` table with SHA-256 hash (`refresh_token_hash`). Plaintext token is never stored in the database.
- **Rotation:** Every call to `POST /api/v1/auth/refresh` issues a new cryptographically random token (`secrets.token_urlsafe(32)`) and revokes the predecessor.
- **Family Reuse Detection:** Each session belongs to a `family_id`. If an already-revoked refresh token is presented outside the rotation grace window, the backend detects token theft and revokes all active sessions sharing that `family_id`.
- **Instant Revocation Capabilities:**
  - **Single Device Logout:** Revokes specific session row (`revoked_at = utc_now()`).
  - **Global Logout (`logout-all`):** Increments `users.token_version`, instantly invalidating all outstanding JWT access tokens across all devices without waiting for expiration.

---

## 2. Ingress & Reverse Proxy Protection

### 2.1 Rate Limiting Architecture
- **Implementation File:** `apps/api/app/core/security/rate_limiter.py`.
- **Algorithm:** Pluggable sliding-window rate limiter with backend abstraction:
  - `InMemoryRateLimiterBackend`: Development, testing, and single-instance local deployments.
  - `RedisRateLimiterBackend`: Production clustering via atomic Redis key expiration.
- **Protected Endpoints:**
  - `POST /api/v1/auth/login`: 5 requests per minute.
  - `POST /api/v1/enquiries`: 10 requests per minute.

### 2.2 Client IP Spoofing Prevention
- **Implementation:** `get_trusted_client_ip()` in `rate_limiter.py`.
- **Mechanism:** Inspects `X-Forwarded-For` from right to left (closest proxy to furthest client). Traverses upstream hops and only trusts IP addresses explicitly matching `settings.TRUSTED_PROXIES` (configured to Nginx / Next.js internal IPs). Returns the rightmost untrusted address, neutralizing spoofed client headers.

### 2.3 Account Lockout Mechanism
- **Implementation File:** `apps/api/app/core/security/lockout.py`.
- **Threshold:** 5 failed authentication attempts within a 15-minute rolling window.
- **Composite Keying:** Keyed on `hashlib.sha256(f"{normalized_email}:{client_ip}")`.
- **Generic Responses:** Returns identical HTTP 401 error message for locked accounts, valid accounts, and non-existent accounts, preventing user enumeration.

---

## 3. Cookie & CSRF Security

### 3.1 Refresh Cookie Configuration
- **Cookie Name:** `prime_refresh_token`.
- **Flags:**
  - `HttpOnly`: Enforced. JavaScript cannot read or extract the token via XSS.
  - `SameSite`: Configured to `'Lax'` (defending against cross-origin state-changing submissions).
  - `Path`: Restricted to `/api/v1/auth`.
  - `Secure`: Dynamically enforced via `settings.AUTH_COOKIE_SECURE` (`True` in production).

### 3.2 CSRF Defense
- On cookie-authenticated state-changing routes, incoming requests must present an `Origin` header matching `settings.ALLOWED_CORS_ORIGINS`.
- If `Origin` is missing (some browser HTTP clients), the backend falls back to verifying the `Referer` header against allowed origins. If neither is valid, the request is rejected with `403 Forbidden`.

---

## 4. Authorization & Privilege Escalation (RBAC)

### 4.1 Role Hierarchy & Granular Permissions
- **System Roles:** `super_admin`, `admin`, `product_manager`, `order_manager`, `support`, `customer`.
- **Hierarchy Weight:** `super_admin (4) > admin (3) > staff (2) > customer (1)`.
- **Dependency Guard:** `require_permission(permission_slug)` in `apps/api/app/core/dependencies/auth.py`.
  - Admin users with `role="admin"` bypass explicit checks.
  - Staff members are evaluated against their assigned `roles.permissions`.
  - Customers (`role="customer"`) have 0 administrative permissions and are blocked by `require_admin_user` with `403 Forbidden`.

### 4.2 Privilege Escalation Protections
- **User Management (`apps/api/app/api/v1/users.py`):**
  - A staff user cannot update their own role or promote any user to a role higher than their own level.
  - Non-super-admins cannot assign the `admin` or `super_admin` role.
- **Role Management (`apps/api/app/api/v1/roles.py`):**
  - Callers cannot create or update a role with permissions that the caller does not already possess.
  - System roles (`is_system=True`) are protected from deletion.

### 4.3 Object-Level Authorization (IDOR Sweep)
- **Orders:** `GET /api/v1/auth/customer/orders/{order_id}` enforces `Order.customer_id == current_user.id`. Non-matching IDs return `404 Not Found` (preventing ID enumeration).
- **Quotations:** `GET /api/v1/auth/customer/quotations/{quotation_id}` enforces `Quotation.customer_id == current_user.id`.
- **Inquiries:** `GET /api/v1/auth/customer/enquiries/{enquiry_id}` enforces `Inquiry.customer_id == current_user.id`.

---

## 5. Storage & File Upload Security

- **Location:** `apps/api/storage/uploads/` (Strictly segregated outside the public web root).
- **Filename Sanitization:** Files are renamed on ingestion to `<uuid4>.<validated_ext>`. Original filenames are kept purely as display metadata in the database.
- **Path Traversal Defense:** Absolute paths, `../`, and null bytes are rejected.
- **MIME & Magic Byte Inspection:** File headers are inspected during upload (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`). Files whose content does not match their extension are rejected with `400 Bad Request`.
- **File Size Cap:** Maximum payload size capped at 10 MB (`MAX_FILE_SIZE = 10 * 1024 * 1024`). Chunked streaming aborts immediately upon exceeding the limit.

---

## 6. Environment & Fail-Closed Startup Validation

In `apps/api/app/config/settings.py`, startup validation enforces:
1. `API_SECRET_KEY` must be >= 32 characters and cannot match known insecure test defaults.
2. Production environment strictly forbids SQLite (`DATABASE_URL` must point to PostgreSQL).
3. In production, default admin bootstrap credentials (`DEFAULT_ADMIN_PASSWORD`) are rejected if using the default value.
4. Production CORS origin cannot use wildcard `'*'` when `allow_credentials=True`.
5. Missing production configurations trigger an immediate application exit during `lifespan` startup.

