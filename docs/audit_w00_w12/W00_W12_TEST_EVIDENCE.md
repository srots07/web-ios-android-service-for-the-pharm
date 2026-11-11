# AUTOMATED TEST EVIDENCE & AUDIT SUITE RESULTS
## PRIME by Activist — Unified Enterprise Platform

**Repository:** `C:\khasim`  
**Audit Date:** 2026-11-11  

---

### 1. Test Suite Summary Matrix

| Quality Check / Suite | Tool & Version | Test Scope / Target | Executed Tests | Result | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Linting** | Ruff 0.8.x | `apps/api/app`, `apps/api/tests` | All source files | **0 errors, 0 warnings** | 0.8s |
| **Backend Static Typing** | Mypy 1.13.x | `apps/api/app` | 21 Python source files | **0 type errors** | 1.9s |
| **Database Migrations** | Alembic 1.14.x | Migration revisions | Head `54132424bde8` | **In Sync / 0 pending** | 0.4s |
| **Backend Unit & API** | Pytest 9.1.x | Security, RBAC, CRUD, Auth | 35 test functions | **35 / 35 PASSED** | 9.17s |
| **Frontend Static Typing**| TypeScript 5.x | `apps/web/src` | Entire Next.js project | **0 type errors** | 3.5s |
| **Frontend Unit & A11y** | Vitest 5.1.x | Client, Forms, Navigation, A11y | 35 test assertions | **35 / 35 PASSED** | 1.77s |
| **Next.js Production Build**| Next.js 15.5.x | Standalone Output | 30 routes | **COMPILED SUCCESS** | 14.8s |
| **Responsive Viewports** | Node / Chrome CDP | 10 viewports $\times$ 9 routes | 90 checks | **90 / 90 PASSED** | 35.2s |

---

### 2. Pytest Execution Transcript Excerpt

```text
tests/test_admin_modules.py::test_admin_list_users PASSED                [  2%]
tests/test_admin_modules.py::test_admin_user_lifecycle PASSED            [  5%]
tests/test_admin_modules.py::test_admin_products_crud_and_validation PASSED [  8%]
tests/test_admin_modules.py::test_public_products_endpoint PASSED        [ 11%]
tests/test_admin_modules.py::test_admin_orders_and_status_transition PASSED [ 14%]
tests/test_admin_modules.py::test_admin_quotation_creation PASSED        [ 17%]
tests/test_admin_modules.py::test_admin_roles_and_permissions PASSED     [ 20%]
tests/test_admin_modules.py::test_customer_forbidden_from_admin_modules PASSED [ 22%]
tests/test_api_integration.py::test_public_categories_endpoint PASSED    [ 25%]
tests/test_api_integration.py::test_admin_document_upload_valid_pdf PASSED [ 28%]
tests/test_api_integration.py::test_admin_document_upload_invalid_mime_rejected PASSED [ 31%]
tests/test_api_integration.py::test_admin_document_upload_oversized_rejected PASSED [ 34%]
tests/test_api_integration.py::test_document_download_and_rbac PASSED    [ 37%]
tests/test_api_integration.py::test_dashboard_summary_live_metrics PASSED [ 40%]
tests/test_api_integration.py::test_enquiry_real_persistence_and_dashboard_reflection PASSED [ 42%]
tests/test_auth.py::test_health PASSED                                   [ 45%]
tests/test_auth.py::test_login_success PASSED                            [ 48%]
tests/test_auth.py::test_login_invalid_password PASSED                   [ 51%]
tests/test_auth.py::test_register_and_login PASSED                       [ 54%]
tests/test_auth.py::test_admin_dashboard_summary PASSED                  [ 57%]
tests/test_security_w11.py::test_unauthenticated_admin_endpoint_rejection PASSED [ 60%]
tests/test_security_w11.py::test_forged_or_malformed_token_rejection PASSED [ 62%]
tests/test_security_w11.py::test_customer_role_admin_access_forbidden PASSED [ 65%]
tests/test_security_w11.py::test_document_upload_mime_type_validation PASSED [ 68%]
tests/test_security_w11.py::test_unauthenticated_document_download_rejection PASSED [ 71%]
tests/test_security_w11.py::test_sql_injection_resilience_in_search PASSED [ 74%]
tests/test_security_w11.py::test_production_fails_closed_without_secrets PASSED [ 77%]
tests/test_workflows_w09.py::test_registration_with_company_and_phone PASSED [ 80%]
tests/test_workflows_w09.py::test_profile_update_and_password_change PASSED [ 82%]
tests/test_workflows_w09.py::test_customer_tenant_isolation PASSED       [ 85%]
tests/test_workflows_w09.py::test_admin_enquiry_workflow PASSED          [ 88%]
tests/test_workflows_w09.py::test_admin_platform_settings PASSED         [ 91%]
tests/test_workflows_w09.py::test_order_state_machine_validation PASSED  [ 94%]
tests/test_workflows_w09.py::test_quotation_workflow_and_calculation PASSED [ 97%]
tests/test_workflows_w09.py::test_super_admin_protections PASSED         [100%]
======================= 35 passed, 2 warnings in 9.17s ========================
```

---

### 3. Vitest Execution Transcript Excerpt

```text
 ✓ src/__tests__/auth.test.ts (6 tests) 8ms
 ✓ src/__tests__/apiClient.test.ts (5 tests) 43ms
 ✓ src/__tests__/forms.test.tsx (6 tests) 103ms
 ✓ src/__tests__/catalog.test.tsx (3 tests) 102ms
 ✓ src/__tests__/navigation.test.tsx (6 tests) 143ms
 ✓ src/__tests__/accessibility.test.tsx (9 tests) 334ms

 Test Files  6 passed (6)
      Tests  35 passed (35)
   Start at  15:18:18
   Duration  1.77s
```

