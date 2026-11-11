# REMEDIATION ROADMAP (W00–W12)
## PRIME by Activist — Unified Enterprise Platform

**Repository:** `C:\khasim`  
**Purpose:** Prioritized Operational Plan for Final Release Preparation  
**Audit Date:** 2026-11-11  

---

### Priority 1: High Priority (Before Multi-Domain Production Launch)

1. **Dynamic CORS Configuration (`SEC-W08-01`):**
   - **Target:** `apps/api/app/main.py:30-34` and `apps/api/app/config/settings.py`
   - **Action:** Add `ALLOWED_CORS_ORIGINS: list[str] = ["http://localhost:3000"]` to `Settings`. In `main.py`, replace the hardcoded origins list with `settings.ALLOWED_CORS_ORIGINS`.
   - **Rationale:** Ensures that if the API and Web frontend are deployed on separate subdomains (e.g. `api.primebyactivist.com` and `primebyactivist.com`), CORS headers are dynamically populated from `deployment.env`.

2. **E2E Test Harness Auth Update (`SEC-W10-01`):**
   - **Target:** `scripts/verify-responsive.mjs:29-50`
   - **Action:** Update the test script to pass authentication headers via CDP network request interception or execute login via UI input filling, aligning with the new in-memory auth store.
   - **Rationale:** Allows complete automated verification of admin modals without relying on deprecated Web Storage tokens.

---

### Priority 2: Medium Priority (Post-Launch Ergonomic Enhancements)

3. **User Management Role Selector Dropdown (`FEAT-W07-01`):**
   - **Target:** `apps/web/src/app/admin/users/page.tsx`
   - **Action:** Add a role selection `<select>` element to the user edit modal, connecting it to the existing backend endpoint `PUT /api/v1/admin/users/{user_id}/role`.

4. **Server-Side PDF Quotation Generation (`FEAT-W09-01`):**
   - **Target:** `services/report-service/` or `apps/api/app/api/v1/quotations.py`
   - **Action:** Integrate ReportLab or WeasyPrint to generate digitally signed PDF files for formal commercial quotations, complementing client-side browser printing.

5. **Legacy Microservice Stubs Documentation (`ARCH-W00-01`):**
   - **Target:** `services/`
   - **Action:** Retain and document `services/` as future extension points for background workers (celery/rabbitmq) or consolidate them into `apps/api`.

