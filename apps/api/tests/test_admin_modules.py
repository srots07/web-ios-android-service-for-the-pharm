import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.session import init_db
from app.config.settings import settings


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()


async def get_admin_token() -> str:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": settings.DEFAULT_ADMIN_EMAIL,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
        return res.json()["access_token"]


async def get_customer_token() -> str:
    unique_email = f"cust_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "CustomerPassword2026!"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Customer",
                "email": unique_email,
                "password": pwd,
                "account_type": "Institutional Buyer",
            },
        )
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": pwd},
        )
        return res.json()["access_token"]


# --- 1. Users Management Tests ---

@pytest.mark.asyncio
async def test_admin_list_users():
    token = await get_admin_token()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            f"/api/v1/admin/users?search={settings.DEFAULT_ADMIN_EMAIL}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert data["total"] >= 1
        assert any(u["email"] == settings.DEFAULT_ADMIN_EMAIL.lower() for u in data["items"])


@pytest.mark.asyncio
async def test_admin_user_lifecycle():
    token = await get_admin_token()
    temp_email = f"test_lifecycle_{uuid.uuid4().hex[:8]}@hospital.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register user
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Dr. Sarah Connor",
                "email": temp_email,
                "password": "Password123!",
                "account_type": "Hospital / Clinic",
            },
        )
        assert reg_res.status_code == 201
        user_id = reg_res.json()["id"]

        # Get details
        detail_res = await ac.get(
            f"/api/v1/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert detail_res.status_code == 200
        assert detail_res.json()["email"] == temp_email

        # Update details
        patch_res = await ac.patch(
            f"/api/v1/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"phone": "+1 555-0199", "country": "Canada"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["phone"] == "+1 555-0199"

        # Suspend user
        suspend_res = await ac.post(
            f"/api/v1/admin/users/{user_id}/suspend",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert suspend_res.status_code == 200
        assert suspend_res.json()["is_active"] is False

        # Reactivate user
        activate_res = await ac.post(
            f"/api/v1/admin/users/{user_id}/activate",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert activate_res.status_code == 200
        assert activate_res.json()["is_active"] is True


# --- 2. Products Management Tests ---

@pytest.mark.asyncio
async def test_admin_products_crud_and_validation():
    token = await get_admin_token()
    unique_sku = f"SKU-{uuid.uuid4().hex[:6].upper()}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create formulation
        create_res = await ac.post(
            "/api/v1/admin/products",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "CardioGuard CoQ10 200mg",
                "category": "Capsules",
                "sku": unique_sku,
                "pack_size": "60 Softgels",
                "description": "High absorption ubiquinone cardio support formulation.",
                "dosage_form": "Softgel",
                "strength": "200 mg",
                "status": "Published",
            },
        )
        assert create_res.status_code == 201
        prod = create_res.json()
        assert prod["sku"] == unique_sku
        prod_id = prod["id"]

        # Reject duplicate SKU
        dup_res = await ac.post(
            "/api/v1/admin/products",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Duplicate Formulation",
                "category": "Capsules",
                "sku": unique_sku,
                "pack_size": "30 Softgels",
            },
        )
        assert dup_res.status_code == 409

        # Archive formulation
        archive_res = await ac.post(
            f"/api/v1/admin/products/{prod_id}/archive",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert archive_res.status_code == 200
        assert archive_res.json()["status"] == "Archived"
        assert archive_res.json()["is_published"] is False

        # Re-publish formulation
        pub_res = await ac.post(
            f"/api/v1/admin/products/{prod_id}/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert pub_res.status_code == 200
        assert pub_res.json()["status"] == "Published"
        assert pub_res.json()["is_published"] is True

        # Attach technical dossier document
        doc_res = await ac.post(
            f"/api/v1/admin/products/{prod_id}/documents",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Certificate of Analysis (Batch #PRM-2026-01)",
                "document_type": "Certificate of Analysis",
                "file_path": "/dossiers/tab-coa.pdf",
                "file_size": 1048576,
            },
        )
        assert doc_res.status_code == 201
        assert doc_res.json()["title"] == "Certificate of Analysis (Batch #PRM-2026-01)"


@pytest.mark.asyncio
async def test_public_products_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/products")
        assert res.status_code == 200
        products = res.json()
        assert len(products) >= 6
        assert any(p["sku"] == "TAB-001" for p in products)


# --- 3. Orders and Quotations Tests ---

@pytest.mark.asyncio
async def test_admin_orders_and_status_transition():
    token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # List orders
        orders_res = await ac.get(
            "/api/v1/admin/orders",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert orders_res.status_code == 200
        orders_data = orders_res.json()
        assert orders_data["total"] >= 1
        test_order_id = orders_data["items"][0]["id"]

        # Get details
        detail_res = await ac.get(
            f"/api/v1/admin/orders/{test_order_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert detail_res.status_code == 200
        assert len(detail_res.json()["items"]) >= 1

        # Transition status
        status_res = await ac.patch(
            f"/api/v1/admin/orders/{test_order_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "status": "Quotation Sent",
                "reason": "Commercial quotation dispatched to hospital procurement team.",
            },
        )
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "Quotation Sent"
        # Verify history recorded
        assert any(h["new_status"] == "Quotation Sent" for h in status_res.json()["status_history"])


@pytest.mark.asyncio
async def test_admin_quotation_creation():
    token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        create_res = await ac.post(
            "/api/v1/admin/quotations",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "recipient_name": "Dr. Helena Troy",
                "recipient_email": "procurement@apollohealth.org",
                "organization": "Apollo Regional Health",
                "country": "Germany",
                "valid_days": 45,
                "currency": "EUR",
                "commercial_terms": "CIF Hamburg, Net 30 payment terms.",
                "items": [
                    {
                        "product_id": "tab-001",
                        "product_name": "Daily Multivitamin Plus",
                        "sku": "TAB-001",
                        "quantity": 10000,
                        "unit_price": 2.85,
                    }
                ],
            },
        )
        assert create_res.status_code == 201
        quote = create_res.json()
        assert quote["total_amount"] == 28500.0
        assert quote["currency"] == "EUR"
        assert quote["status"] == "Draft"
        quote_id = quote["id"]

        # Update quotation status
        patch_res = await ac.patch(
            f"/api/v1/admin/quotations/{quote_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "Sent"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "Sent"


# --- 4. Roles and Permissions & RBAC Enforcement Tests ---

@pytest.mark.asyncio
async def test_admin_roles_and_permissions():
    token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Get permissions
        perm_res = await ac.get(
            "/api/v1/admin/permissions",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert perm_res.status_code == 200
        perms = perm_res.json()
        assert len(perms) >= 15
        assert any(p["slug"] == "users.read" for p in perms)
        assert any(p["slug"] == "products.create" for p in perms)

        # List roles
        roles_res = await ac.get(
            "/api/v1/admin/roles",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert roles_res.status_code == 200
        roles = roles_res.json()
        assert len(roles) >= 4
        assert any(r["slug"] == "super_admin" for r in roles)

        # Create custom role
        custom_name = f"Logistics Coordinator {uuid.uuid4().hex[:4]}"
        create_role_res = await ac.post(
            "/api/v1/admin/roles",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": custom_name,
                "description": "Handles dispatch logistics and shipping notifications.",
                "permission_ids": [p["id"] for p in perms if p["slug"].startswith("orders.")],
            },
        )
        assert create_role_res.status_code == 201
        custom_role = create_role_res.json()
        assert custom_role["name"] == custom_name
        assert custom_role["is_system"] is False

        # Attempt to delete system role (must be rejected)
        super_admin_role = next(r for r in roles if r["slug"] == "super_admin")
        del_system_res = await ac.delete(
            f"/api/v1/admin/roles/{super_admin_role['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_system_res.status_code == 403

        # Delete custom role (allowed)
        del_custom_res = await ac.delete(
            f"/api/v1/admin/roles/{custom_role['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_custom_res.status_code == 200


@pytest.mark.asyncio
async def test_customer_forbidden_from_admin_modules():
    customer_token = await get_customer_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {customer_token}"}

        # Customer accessing /admin/users -> 403
        res1 = await ac.get("/api/v1/admin/users", headers=headers)
        assert res1.status_code == 403

        # Customer accessing /admin/products -> 403
        res2 = await ac.get("/api/v1/admin/products", headers=headers)
        assert res2.status_code == 403

        # Customer accessing /admin/orders -> 403
        res3 = await ac.get("/api/v1/admin/orders", headers=headers)
        assert res3.status_code == 403

        # Customer accessing /admin/roles -> 403
        res4 = await ac.get("/api/v1/admin/roles", headers=headers)
        assert res4.status_code == 403

