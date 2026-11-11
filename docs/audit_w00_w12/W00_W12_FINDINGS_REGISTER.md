# FINDINGS REGISTER (W00–W12 AUDIT)
## PRIME by Activist — Unified Enterprise Platform

**Repository:** `C:\khasim`  
**Review Type:** Independent Technical Audit & Quality Verification  
**Audit Date:** 2026-11-11  
**Total Findings:** 8 (0 Critical, 2 High, 4 Medium, 2 Low)

---

### Finding Summary Matrix

| ID | Phase | Severity | Title | Evidence Label | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SEC-W10-01` | W10 | **HIGH** | In-Browser E2E Script Login Failure Due to Removed `sessionStorage` | TESTED FAIL | OPEN (Test Infrastructure Only) |
| `SEC-W08-01` | W08 | **HIGH** | FastAPI CORS Missing Configurable Production Origins in `main.py` | VERIFIED | OPEN |
| `FEAT-W07-01`| W07 | **MEDIUM** | Frontend User Modal Lacks Direct Role Reassignment Select | VERIFIED | OPEN |
| `FEAT-W09-01`| W09 | **MEDIUM** | Quotation PDF Generation Relies on Client Print Rather Than Server Stream | VERIFIED | OPEN |
| `ARCH-W00-01`| W00 | **MEDIUM** | Residual Legacy Microservice Stubs (`services/*`) Unwired to Core App | VERIFIED | OPEN |
| `UX-W04-01`  | W04 | **MEDIUM** | Contact Form Lacks Debouncing on Submission Button | VERIFIED | OPEN |
| `PERF-W10-01`| W10 | **LOW** | Viewport Emulation Falls Back to Default Viewport Scale on Initial Route | VERIFIED | OPEN |
| `DOC-W12-01` | W12 | **LOW** | Production Compose Network Uses Bridge Instead of Overlay Driver | VERIFIED | OPEN |

---

### Detailed Finding Reports

#### Finding ID: `SEC-W10-01`
- **Phase:** W10 (Responsive Optimization)
- **Severity:** HIGH (Test Harness Defect)
- **Status:** OPEN
- **File:** `scripts/verify-responsive.mjs:29-50`
- **Evidence Label:** TESTED FAIL
- **Actual Evidence:**
  ```text
  Fetching live JWT token from FastAPI backend...
  Failed to fetch token from backend: Cannot read properties of undefined (reading 'substring')
  In-browser authenticated login result: { status: 401 }
  ```
- **Expected Behavior:** E2E test script should log in via `/api/v1/auth/login` and populate the reactive in-memory auth store rather than expecting legacy `sessionStorage` or outdated credentials.
- **Actual Behavior:** The script attempts to set legacy `sessionStorage`, which was deliberately removed in W11 security remediation. As a result, the browser context redirects to `/login` when requesting `/admin/*` routes, causing drawer and modal DOM elements to not be found in that specific script.
- **Business/Security Impact:** No impact on end-user security (the real app works properly and secure cookies/memory tokens protect users), but automated verification of admin modals via Chrome CDP fails to assert DOM elements.
- **Recommended Action:** Update `scripts/verify-responsive.mjs` to authenticate via the UI form (`fill input[name=email]`, `click button[type=submit]`) or set the HTTP-only refresh cookie on the CDP network domain.

---

#### Finding ID: `SEC-W08-01`
- **Phase:** W08 (API Integration) / W12 (Deployment Preparation)
- **Severity:** HIGH
- **Status:** OPEN
- **File:** `apps/api/app/main.py:30-34`
- **Evidence Label:** VERIFIED
- **Actual Evidence:**
  ```python
  application.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:8000",
      ],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **Expected Behavior:** In production, CORS allowed origins should be driven dynamically by an environment variable (e.g. `ALLOWED_CORS_ORIGINS`) and include the production domain.
- **Actual Behavior:** Origins are hardcoded to local development ports (`localhost:3000`). While Nginx proxies `/api` directly in Docker Compose (avoiding cross-origin CORS altogether on single-domain deployments), separate domain deployments (e.g., `api.primebyactivist.com` vs `primebyactivist.com`) would be blocked.
- **Business/Security Impact:** Cross-origin API calls from external domains will be rejected by CORS in multi-domain setups.
- **Recommended Action:** Add `ALLOWED_CORS_ORIGINS: list[str] = ["http://localhost:3000"]` to `Settings` and load from comma-delimited environment variable.

---

#### Finding ID: `FEAT-W07-01`
- **Phase:** W07 (Admin Modules)
- **Severity:** MEDIUM
- **Status:** OPEN
- **File:** `apps/web/src/app/admin/users/page.tsx:80-140`
- **Evidence Label:** VERIFIED
- **Actual Evidence:** Backend `/api/v1/admin/users/{user_id}/role` endpoint exists and is tested, but the user management modal in the frontend only updates name, email, and active status, without exposing a dropdown to reassign system roles directly from the edit modal.
- **Expected Behavior:** Admins should be able to change user roles directly in the edit user dialog.
- **Actual Behavior:** Role assignment must be initiated via API or the roles administration tab.
- **Business/Security Impact:** Administrative overhead for staff promoting customers to managers.
- **Recommended Action:** Add role selector dropdown to `AdminUserModal`.

---

#### Finding ID: `FEAT-W09-01`
- **Phase:** W09 (Forms & Workflows)
- **Severity:** MEDIUM
- **Status:** OPEN
- **File:** `apps/web/src/app/admin/quotations/page.tsx:160-195`
- **Evidence Label:** VERIFIED
- **Actual Evidence:** Formal quotation documents are rendered in a print-optimized CSS view in the browser rather than generating a signed PDF via a backend headless renderer.
- **Expected Behavior:** Enterprise ERPs typically offer downloadable signed PDF quotation attachments.
- **Actual Behavior:** Users print via browser print dialog (`window.print()`).
- **Business/Security Impact:** Minor format discrepancies depending on client printer drivers.
- **Recommended Action:** Integrate ReportLab or WeasyPrint in `services/report-service` in future enterprise enhancements.

---

#### Finding ID: `ARCH-W00-01`
- **Phase:** W00 (Existing Frontend Audit)
- **Severity:** MEDIUM
- **Status:** OPEN
- **File:** `services/report-service/`, `services/file-service/`, `services/notification-service/`
- **Evidence Label:** VERIFIED
- **Actual Evidence:** The repository contains stub directories under `services/` from the initial template scaffolding that are not referenced by either Next.js or FastAPI.
- **Expected Behavior:** All functional services are either consolidated or active.
- **Actual Behavior:** The platform core is consolidated inside `apps/api` (FastAPI) and `apps/web` (Next.js). The microservice directories are legacy stubs.
- **Business/Security Impact:** Minor cognitive load for new developers reviewing the repository tree.
- **Recommended Action:** Retain stubs for Phase W13+ background worker expansion, or document them explicitly as modular growth containers.

