# DATABASE AUDIT (W00–W12)
## PRIME by Activist — Unified Enterprise Platform

**Repository:** `C:\khasim`  
**ORM / Driver:** SQLAlchemy 2.0 (AsyncIO) / asyncpg & aiosqlite  
**Migration Tool:** Alembic  
**Audit Date:** 2026-11-11  

---

### 1. Database Schema & Migration Status

- **Alembic Version Location:** `apps/api/alembic/versions`
- **Current Head Revision:** `54132424bde8` (`w09_workflow_schema_extensions`)
- **Parent Revision:** `893632c08318` (`w08_schema_baseline_and_categories_files`)
- **Alembic Check Result:**
  ```text
  INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
  INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
  No new upgrade operations detected.
  ```
- **Schema Synchronization Status:** **VERIFIED IN SYNC (0 PENDING MIGRATIONS)**

---

### 2. Relational Entity Inventory

| Table Name | Primary Key | Foreign Keys & Relationships | Key Indexes & Constraints | Data Classification |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `id` (String) | `role_id` $\to$ `roles.id` | Unique `email`, indexed `is_active` | Confidential User Profiles |
| `roles` | `id` (String) | Many-to-Many $\to$ `permissions` | Unique `slug`, `name` | System RBAC Definitions |
| `permissions` | `id` (String) | Many-to-Many $\to$ `roles` | Unique `slug` | System RBAC Privileges |
| `role_permissions`| Composite | `role_id`, `permission_id` | Foreign Key Cascades | Association Table |
| `product_categories`| `id` (String) | 1-to-Many $\to$ `products` | Unique `slug`, indexed `display_order` | Public Formulation Metadata |
| `products` | `id` (String) | `category_id` $\to$ `product_categories.id` | Unique `sku`, indexed `is_published` | Product Catalogue |
| `orders` | `id` (String) | `customer_id` $\to$ `users.id` | Unique `order_number`, indexed `status`| Commercial Orders |
| `order_items` | `id` (String) | `order_id` $\to$ `orders.id` | Composite index on `order_id` | Order Line Items |
| `order_status_history`| `id` (String)| `order_id` $\to$ `orders.id` | Index on `(order_id, created_at)` | Immutable Audit Log |
| `quotations` | `id` (String) | `customer_id` $\to$ `users.id`, `order_id` $\to$ `orders.id` | Unique `quotation_number`, index `status` | Commercial Quotes |
| `quotation_items`| `id` (String) | `quotation_id` $\to$ `quotations.id` | Composite index on `quotation_id` | Quotation Line Items |
| `uploaded_files`| `id` (String) | `uploaded_by_id` $\to$ `users.id` | Unique `stored_filename` | Regulatory Dossiers |
| `audit_events` | `id` (String) | `user_id` $\to$ `users.id` (nullable) | Indexed `event_type`, `created_at` | System & Inquiry Audit Logs |
| `platform_settings`| `id` (String)| None | Unique `key`, indexed `category` | Enterprise Parameters |

---

### 3. ACID Compliance & Data Integrity Checks

1. **Foreign Key Integrity:** All child records (`order_items`, `quotation_items`, `order_status_history`) enforce referential integrity with cascading constraints.
2. **Transaction Rollback:** All multi-step operations (e.g. creating an order along with line items and an audit history event) are wrapped in `async with session.begin()` blocks, guaranteeing atomic commits or complete rollbacks upon failure.
3. **Optimistic Locking / Status Guard:** Order transitions check current status before writing to prevent race conditions during concurrent admin updates.
