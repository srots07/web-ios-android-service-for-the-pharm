# BUSINESS WORKFLOW AUDIT (W00–W12)
## PRIME by Activist — Unified Enterprise Platform

**Repository:** `C:\khasim`  
**Scope:** Order State Machine, Quotation Calculations, Inquiry Handling, Dossier Uploads  
**Audit Date:** 2026-11-11  

---

### 1. Order Lifecycle State Machine

The order lifecycle implements strict business workflow rules:

```text
[ SUBMITTED ]
      |
      v
[ IN REVIEW ]
      |
      +---> [ CANCELLED ]
      |
      v
[ QUOTATION SENT ]
      |
      v
[ CONFIRMED ]
      |
      v
[ IN PRODUCTION ]
      |
      v
[ SHIPPED ]
      |
      v
[ DELIVERED ]
```

#### Valid Transition Matrix

| From State | Permitted Next States | Blocked / Invalid Transitions |
| :--- | :--- | :--- |
| `submitted` | `in_review`, `cancelled` | `confirmed`, `shipped`, `delivered` (HTTP 400) |
| `in_review` | `quotation_sent`, `cancelled` | `shipped`, `delivered` (HTTP 400) |
| `quotation_sent` | `confirmed`, `cancelled` | `in_production`, `delivered` (HTTP 400) |
| `confirmed` | `in_production`, `cancelled` | `submitted`, `delivered` (HTTP 400) |
| `in_production` | `shipped`, `cancelled` | `submitted`, `quotation_sent` (HTTP 400) |
| `shipped` | `delivered` | Any prior state (HTTP 400) |
| `delivered` | *(Terminal State)* | Any transition (HTTP 400) |
| `cancelled` | *(Terminal State)* | Any transition (HTTP 400) |

- **Verification Evidence:** `tests/test_workflows_w09.py::test_order_state_machine_validation` executes 7 transition checks, confirming illegal transitions trigger HTTP 400 and append to `order_status_history`.
- **Status:** **TESTED PASS**

---

### 2. Quotation Engine & Mathematical Precision

1. **Precision Standard:** Item unit prices, discount percentages, and tax rates are calculated with 2 decimal precision.
2. **Formula Verified:**
   $$\text{Total Price} = (\text{Quantity} \times \text{Unit Price}) - \text{Discount} + \text{Tax}$$
3. **Validity Period:** Quotation model persists `valid_until` timestamp based on `quote_validity_days` platform setting (default: 30 days).
4. **Verification Evidence:** `tests/test_workflows_w09.py::test_quotation_workflow_and_calculation` passed with mathematical precision confirmed.
- **Status:** **TESTED PASS**

---

### 3. Customer Inquiry & Contact Form Persistence

1. **Zero Mock Policy:** When visitors submit a contact inquiry on `/contact` or a commercial product inquiry, the data is validated via Zod on the frontend and persisted as an `AuditEvent` with type `contact_enquiry` or `product_inquiry`.
2. **Dashboard Reflection:** Unhandled inquiries are aggregated into the live Admin Dashboard metric card.
3. **Verification Evidence:** `tests/test_api_integration.py::test_enquiry_real_persistence_and_dashboard_reflection` passed.
- **Status:** **TESTED PASS**

