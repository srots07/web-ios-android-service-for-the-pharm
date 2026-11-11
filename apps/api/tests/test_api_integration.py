import io
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
    unique_email = f"w08_cust_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "CustomerPassword2026!"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "W08 Customer",
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


# --- 1. Public Product Categories Persistence ---

@pytest.mark.asyncio
async def test_public_categories_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/categories")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        slugs = [cat["slug"] for cat in data]
        assert "tablets" in slugs
        assert "capsules" in slugs
        assert "syrups-susp" in slugs

        # Verify category attributes
        first = data[0]
        assert "id" in first
        assert "name" in first
        assert "slug" in first
        assert "description" in first
        assert "display_order" in first


# --- 2. Real Binary Document Upload & Storage ---

@pytest.mark.asyncio
async def test_admin_document_upload_valid_pdf():
    token = await get_admin_token()
    pdf_content = b"%PDF-1.5 Sample pharmaceutical certificate of analysis content"
    files = {
        "file": ("batch_coa_001.pdf", io.BytesIO(pdf_content), "application/pdf")
    }
    data = {"category": "Certificate of Analysis"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/admin/documents/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201
        doc = res.json()
        assert doc["filename"] == "batch_coa_001.pdf"
        assert doc["content_type"] == "application/pdf"
        assert doc["file_size"] == len(pdf_content)
        assert doc["category"].lower() == "certificate of analysis"
        assert "download_url" in doc
        assert doc["download_url"].startswith("/api/v1/admin/documents/")


@pytest.mark.asyncio
async def test_admin_document_upload_invalid_mime_rejected():
    token = await get_admin_token()
    exe_content = b"MZ\x90\x00\x03\x00\x00\x00BinaryExecutableMock"
    files = {
        "file": ("malicious_payload.exe", io.BytesIO(exe_content), "application/x-msdownload")
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/admin/documents/upload",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400
        assert "unsupported file type" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_document_upload_oversized_rejected():
    token = await get_admin_token()
    # 11MB file (limit is 10MB)
    oversized_content = b"0" * (11 * 1024 * 1024)
    files = {
        "file": ("huge_dossier.pdf", io.BytesIO(oversized_content), "application/pdf")
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/admin/documents/upload",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 413
        assert "exceeds maximum allowed size" in res.json()["detail"].lower()


# --- 3. Binary Document Download & RBAC Protection ---

@pytest.mark.asyncio
async def test_document_download_and_rbac():
    admin_token = await get_admin_token()
    customer_token = await get_customer_token()

    # Upload as admin
    test_bytes = b"%PDF-1.4 Specimen QC Report Data Activist Pharma"
    files = {
        "file": ("qc_report.pdf", io.BytesIO(test_bytes), "application/pdf")
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        upload_res = await ac.post(
            "/api/v1/admin/documents/upload",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert upload_res.status_code == 201
        doc_id = upload_res.json()["id"]

        # 1. Admin download succeeds and streams exact bytes
        download_res = await ac.get(
            f"/api/v1/admin/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert download_res.status_code == 200
        assert download_res.content == test_bytes
        assert download_res.headers["content-type"] == "application/pdf"

        # 2. Customer token without documents:read permission gets 403 Forbidden
        cust_res = await ac.get(
            f"/api/v1/admin/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert cust_res.status_code == 403

        # 3. Unauthenticated request gets 401
        unauth_res = await ac.get(f"/api/v1/admin/documents/{doc_id}/download")
        assert unauth_res.status_code == 401


# --- 4. Live Dashboard Summary with Order & Quotation Metrics ---

@pytest.mark.asyncio
async def test_dashboard_summary_live_metrics():
    token = await get_admin_token()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/admin/dashboard/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()

        # Core counts
        assert "users" in data
        assert "products" in data
        assert "inquiries" in data
        assert "orders" in data
        assert "quotations" in data

        # Order detailed metrics
        orders_metric = data["orders"]
        assert "total" in orders_metric
        assert "pending" in orders_metric
        assert "confirmed" in orders_metric
        assert "in_production" in orders_metric

        # Quotation detailed metrics
        quotes_metric = data["quotations"]
        assert "total" in quotes_metric
        assert "draft" in quotes_metric
        assert "sent" in quotes_metric
        assert "accepted" in quotes_metric
        assert "total_pipeline_value" in quotes_metric


# --- 5. Contact Enquiry Real Persistence ---

@pytest.mark.asyncio
async def test_enquiry_real_persistence_and_dashboard_reflection():
    ref_suffix = uuid.uuid4().hex[:6]
    enquiry_payload = {
        "full_name": f"Procurement Director {ref_suffix}",
        "email": f"procure_{ref_suffix}@medsupply.org",
        "organization": "Apollo Regional Health Authority",
        "subject": "Bulk Commercial Allocation Enquiry for Paracetamol 650mg",
        "message": "We require 50,000 packs on quarterly recurring CIF delivery terms.",
        "enquiry_type": "Commercial Tender",
        "phone": "+91 98765 43210",
        "country": "India",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Submit public enquiry
        res = await ac.post("/api/v1/enquiries", json=enquiry_payload)
        assert res.status_code == 201
        data = res.json()
        assert data["reference_id"].startswith("PRM-INQ-")
        assert data["email"] == enquiry_payload["email"]
        assert data["status"] == "Pending"

        # 2. Verify in admin dashboard recent inquiries
        admin_token = await get_admin_token()
        dash_res = await ac.get(
            "/api/v1/admin/dashboard/summary",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert dash_res.status_code == 200
        recent_inquiries = dash_res.json()["recent_inquiries"]
        ref_ids = [inq["reference_id"] for inq in recent_inquiries]
        assert data["reference_id"] in ref_ids
