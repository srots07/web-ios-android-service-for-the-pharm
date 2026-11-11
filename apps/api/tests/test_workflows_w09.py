import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config.settings import settings
from app.database.session import init_db
from app.main import app


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
        assert res.status_code == 200, res.text
        return res.json()["access_token"]


async def create_user_with_details(email: str, password: str, company: str, phone: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Workflow Buyer",
                "email": email,
                "password": password,
                "account_type": "Pharmacy / Retailer",
                "country": "Tanzania",
                "company_name": company,
                "phone": phone,
            },
        )
        assert reg_res.status_code == 201, reg_res.text
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login_res.status_code == 200, login_res.text
        return login_res.json()["access_token"]


# --- 1. User Registration with Company & Phone ---

@pytest.mark.asyncio
async def test_registration_with_company_and_phone():
    email = f"pharma_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SecurePassword2026!"
    company = "Kilimanjaro Health Network"
    phone = "+255 754 112233"

    token = await create_user_with_details(email, pwd, company, phone)
    assert token

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == email
        assert data["company_name"] == company
        assert data["phone"] == phone


# --- 2. Customer Profile Update & Password Change ---

@pytest.mark.asyncio
async def test_profile_update_and_password_change():
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    old_pwd = "OldPassword2026!"
    new_pwd = "NewPassword2026!Updated"

    token = await create_user_with_details(email, old_pwd, "Old Company", "+11111111")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {token}"}

        # Profile update
        update_res = await ac.patch(
            "/api/v1/auth/profile",
            headers=headers,
            json={
                "full_name": "Updated Buyer Name",
                "company_name": "Aga Khan Pharmaceuticals",
                "phone": "+255 22 211 5555",
                "business_address": "Ocean Road, Dar es Salaam",
            },
        )
        assert update_res.status_code == 200
        up_data = update_res.json()
        assert up_data["full_name"] == "Updated Buyer Name"
        assert up_data["company_name"] == "Aga Khan Pharmaceuticals"
        assert up_data["phone"] == "+255 22 211 5555"
        assert up_data["business_address"] == "Ocean Road, Dar es Salaam"

        # Password change with wrong current password
        bad_change = await ac.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": "WrongPassword!",
                "new_password": new_pwd,
            },
        )
        assert bad_change.status_code == 400

        # Password change with correct current password
        good_change = await ac.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": old_pwd,
                "new_password": new_pwd,
            },
        )
        assert good_change.status_code == 200

        # Login with old password fails
        fail_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": old_pwd},
        )
        assert fail_login.status_code == 401

        # Login with new password succeeds
        ok_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": new_pwd},
        )
        assert ok_login.status_code == 200


# --- 3. Customer Tenant Isolation ---

@pytest.mark.asyncio
async def test_customer_tenant_isolation():
    user_a_email = f"buyer_a_{uuid.uuid4().hex[:6]}@example.com"
    user_b_email = f"buyer_b_{uuid.uuid4().hex[:6]}@example.com"

    token_a = await create_user_with_details(user_a_email, "PasswordA2026!", "Company A", "+100")
    token_b = await create_user_with_details(user_b_email, "PasswordB2026!", "Company B", "+200")
    admin_token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Submit enquiry as User A
        enq_res = await ac.post(
            "/api/v1/enquiries",
            json={
                "fullName": "Buyer A",
                "email": user_a_email,
                "country": "Tanzania",
                "organization": "Company A",
                "subject": "User A Private Inquiry",
                "message": "Clinical batch request for Company A",
            },
        )
        assert enq_res.status_code == 201

        # Create Order for User A
        ord_res = await ac.post(
            "/api/v1/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "customer_name": "Buyer A",
                "customer_email": user_a_email,
                "organization": "Company A",
                "country": "Tanzania",
                "items": [
                    {
                        "product_id": "TAB-001",
                        "product_name": "Formulation A",
                        "sku": "TAB-001",
                        "quantity": 1000,
                    }
                ],
            },
        )
        assert ord_res.status_code == 201

        # Create Quotation for User A
        quot_res = await ac.post(
            "/api/v1/admin/quotations",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "recipient_name": "Buyer A",
                "recipient_email": user_a_email,
                "organization": "Company A",
                "country": "Tanzania",
                "currency": "USD",
                "valid_days": 30,
                "items": [
                    {
                        "product_id": "TAB-001",
                        "product_name": "Formulation A",
                        "sku": "TAB-001",
                        "quantity": 1000,
                        "unit_price": 5.0,
                    }
                ],
            },
        )
        assert quot_res.status_code == 201

        # Query User A customer endpoints
        cust_a_enq = await ac.get(
            "/api/v1/auth/customer/enquiries",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert cust_a_enq.status_code == 200
        a_enquiries = cust_a_enq.json()
        assert len(a_enquiries) >= 1
        assert all(e["email"] == user_a_email for e in a_enquiries)

        cust_a_ord = await ac.get(
            "/api/v1/auth/customer/orders",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert cust_a_ord.status_code == 200
        a_orders = cust_a_ord.json()
        assert len(a_orders) >= 1
        assert all(o["customer_email"] == user_a_email for o in a_orders)

        cust_a_quot = await ac.get(
            "/api/v1/auth/customer/quotations",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert cust_a_quot.status_code == 200
        a_quotations = cust_a_quot.json()
        assert len(a_quotations) >= 1
        assert all(q["recipient_email"] == user_a_email for q in a_quotations)

        # Query User B: Must see NONE of User A's records
        cust_b_enq = await ac.get(
            "/api/v1/auth/customer/enquiries",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert cust_b_enq.status_code == 200
        assert not any(e["email"] == user_a_email for e in cust_b_enq.json())

        cust_b_ord = await ac.get(
            "/api/v1/auth/customer/orders",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert cust_b_ord.status_code == 200
        assert not any(o["customer_email"] == user_a_email for o in cust_b_ord.json())

        cust_b_quot = await ac.get(
            "/api/v1/auth/customer/quotations",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert cust_b_quot.status_code == 200
        assert not any(q["recipient_email"] == user_a_email for q in cust_b_quot.json())


# --- 4. Admin Enquiry Management Workflow ---

@pytest.mark.asyncio
async def test_admin_enquiry_workflow():
    admin_token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Public submit
        post_res = await ac.post(
            "/api/v1/enquiries",
            json={
                "fullName": "Director of Procurement",
                "email": "director@medeast.org",
                "country": "Kenya",
                "organization": "Medeast Hospital",
                "subject": "Institutional Vaccine Supply",
                "message": "Require 100,000 vials of freeze-dried formulation.",
            },
        )
        assert post_res.status_code == 201
        ref_id = post_res.json()["referenceId"]

        # Admin lists enquiries
        list_res = await ac.get(
            "/api/v1/admin/enquiries?search=director@medeast.org",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        assert len(items) >= 1
        enq_id = items[0]["id"]

        # Admin gets detail
        detail_res = await ac.get(
            f"/api/v1/admin/enquiries/{enq_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert detail_res.status_code == 200
        assert detail_res.json()["reference_id"] == ref_id

        # Admin patches status and internal notes
        patch_res = await ac.patch(
            f"/api/v1/admin/enquiries/{enq_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "status": "Reviewing",
                "internal_notes": "Assigned to Institutional Desk for dossier review.",
            },
        )
        assert patch_res.status_code == 200
        patched = patch_res.json()
        assert patched["status"] == "Reviewing"
        assert patched["internal_notes"] == "Assigned to Institutional Desk for dossier review."


# --- 5. Admin Platform Settings ---

@pytest.mark.asyncio
async def test_admin_platform_settings():
    admin_token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Get settings
        get_res = await ac.get("/api/v1/admin/settings", headers=headers)
        assert get_res.status_code == 200
        settings_list = get_res.json()["items"]
        assert len(settings_list) >= 5

        # Patch valid setting
        patch_res = await ac.patch(
            "/api/v1/admin/settings",
            headers=headers,
            json={
                "settings": {
                    "company_name": "PRIME by Activist East Africa",
                    "quote_validity_days": "45",
                }
            },
        )
        assert patch_res.status_code == 200
        updated = {item["key"]: item["value"] for item in patch_res.json()["items"]}
        assert updated["company_name"] == "PRIME by Activist East Africa"
        assert updated["quote_validity_days"] == "45"

        # Patch with unknown key rejected
        bad_patch = await ac.patch(
            "/api/v1/admin/settings",
            headers=headers,
            json={"settings": {"invalid_nonexistent_key": "some_value"}},
        )
        assert bad_patch.status_code == 400


# --- 6. Order State Machine Validation ---

@pytest.mark.asyncio
async def test_order_state_machine_validation():
    admin_token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create order
        create_res = await ac.post(
            "/api/v1/admin/orders",
            headers=headers,
            json={
                "customer_name": "Order Client",
                "customer_email": "client@orderwf.org",
                "country": "Rwanda",
                "items": [
                    {
                        "product_id": "OR-001",
                        "product_name": "Paracetamol 500mg",
                        "sku": "PAR-500",
                        "quantity": 10000,
                    }
                ],
            },
        )
        assert create_res.status_code == 201
        order_id = create_res.json()["id"]
        assert create_res.json()["status"] == "Submitted"

        # Valid transition: Submitted -> In Review
        t1 = await ac.patch(
            f"/api/v1/admin/orders/{order_id}/status",
            headers=headers,
            json={"status": "In Review", "reason": "Procurement committee reviewing dossier"},
        )
        assert t1.status_code == 200
        assert t1.json()["status"] == "In Review"

        # Illegal transition: In Review -> Delivered (skipping production and shipping)
        bad_t = await ac.patch(
            f"/api/v1/admin/orders/{order_id}/status",
            headers=headers,
            json={"status": "Delivered", "reason": "Illegal jump"},
        )
        assert bad_t.status_code == 400
        assert "Illegal workflow transition" in bad_t.json()["detail"]


# --- 7. Quotation Workflow & Authoritative Backend Calculation ---

@pytest.mark.asyncio
async def test_quotation_workflow_and_calculation():
    admin_token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create quotation with line items
        create_res = await ac.post(
            "/api/v1/admin/quotations",
            headers=headers,
            json={
                "recipient_name": "Apex Hospital",
                "recipient_email": "procure@apexhosp.org",
                "organization": "Apex Healthcare",
                "country": "Uganda",
                "currency": "USD",
                "valid_days": 30,
                "items": [
                    {
                        "product_id": "AMX-500",
                        "product_name": "Amoxicillin 500mg",
                        "sku": "AMX-500",
                        "quantity": 1000,
                        "unit_price": 2.50,
                    },
                    {
                        "product_id": "CIP-500",
                        "product_name": "Ciprofloxacin 500mg",
                        "sku": "CIP-500",
                        "quantity": 2000,
                        "unit_price": 3.00,
                    },
                ],
            },
        )
        assert create_res.status_code == 201
        quote_data = create_res.json()
        quote_id = quote_data["id"]
        # Expected: 1000 * 2.5 + 2000 * 3.0 = 2500 + 6000 = 8500.0
        assert quote_data["total_amount"] == 8500.0
        assert quote_data["status"] == "Draft"

        # Edit draft quotation (valid in Draft state)
        patch_res = await ac.patch(
            f"/api/v1/admin/quotations/{quote_id}",
            headers=headers,
            json={
                "valid_days": 40,
                "items": [
                    {
                        "product_id": "AMX-500",
                        "product_name": "Amoxicillin 500mg",
                        "sku": "AMX-500",
                        "quantity": 2000,
                        "unit_price": 2.50,
                    }
                ],
            },
        )
        assert patch_res.status_code == 200
        # Authoritative recalculation: 2000 * 2.50 = 5000.0
        assert patch_res.json()["total_amount"] == 5000.0

        # Advance state Draft -> Sent -> Accepted
        s1 = await ac.patch(
            f"/api/v1/admin/quotations/{quote_id}/status",
            headers=headers,
            json={"status": "Sent"},
        )
        assert s1.status_code == 200

        s2 = await ac.patch(
            f"/api/v1/admin/quotations/{quote_id}/status",
            headers=headers,
            json={"status": "Accepted"},
        )
        assert s2.status_code == 200
        assert s2.json()["status"] == "Accepted"

        # Attempt to edit finalized Accepted quotation -> must fail with 400
        edit_locked = await ac.patch(
            f"/api/v1/admin/quotations/{quote_id}",
            headers=headers,
            json={"valid_days": 60},
        )
        assert edit_locked.status_code == 400
        assert "Only Draft quotations can be modified" in edit_locked.json()["detail"]


# --- 8. Super Admin Protection & Privilege Escalation Prevention ---

@pytest.mark.asyncio
async def test_super_admin_protections():
    admin_token = await get_admin_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Query admin users
        me_res = await ac.get("/api/v1/auth/me", headers=admin_headers)
        super_admin_id = me_res.json()["id"]

        # Attempt to demote/suspend the last active super admin
        demote_res = await ac.patch(
            f"/api/v1/admin/users/{super_admin_id}",
            headers=admin_headers,
            json={"role": "customer"},
        )
        assert demote_res.status_code == 400
        assert "Cannot remove or demote the last active Super Admin" in demote_res.json()["detail"]

        suspend_res = await ac.post(
            f"/api/v1/admin/users/{super_admin_id}/suspend",
            headers=admin_headers,
        )
        assert suspend_res.status_code == 400
        assert (
            "You cannot suspend your own administrative account" in suspend_res.json()["detail"]
            or "Cannot suspend the last" in suspend_res.json()["detail"]
        )
