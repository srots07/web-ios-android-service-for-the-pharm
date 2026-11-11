import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config.settings import settings
from app.core.security.tokens import create_access_token
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
        assert res.status_code == 200
        return res.json()["access_token"]


async def get_customer_token() -> str:
    unique_email = f"customer_{uuid.uuid4().hex[:8]}@example.com"
    password = "CustomerPassword2026!"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg = await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Customer",
                "email": unique_email,
                "password": password,
                "account_type": "Pharmacy / Retailer",
            },
        )
        assert reg.status_code == 201
        login = await ac.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": password},
        )
        assert login.status_code == 200
        return login.json()["access_token"]


@pytest.mark.asyncio
async def test_unauthenticated_admin_endpoint_rejection():
    """Unauthenticated access to admin endpoints must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/users")
        assert res.status_code == 401

        res_orders = await ac.get("/api/v1/admin/orders")
        assert res_orders.status_code == 401


@pytest.mark.asyncio
async def test_forged_or_malformed_token_rejection():
    """Forged or malformed Bearer tokens must return 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Arbitrary string
        res = await ac.get(
            "/api/v1/admin/users",
            headers={"Authorization": "Bearer not-a-valid-jwt-token"},
        )
        assert res.status_code == 401

        # 2. Token signed with wrong secret key
        forged_token = create_access_token(
            data={"sub": "admin@example.com", "role": "admin"},
        )
        # Tamper with signature
        tampered_token = forged_token[:-6] + "tamper"
        res2 = await ac.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )
        assert res2.status_code == 401


@pytest.mark.asyncio
async def test_customer_role_admin_access_forbidden():
    """Standard customer token must receive 403 Forbidden on administrative routes."""
    customer_token = await get_customer_token()
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Accessing users list
        res_users = await ac.get("/api/v1/admin/users", headers=headers)
        assert res_users.status_code == 403

        # Accessing roles management
        res_roles = await ac.get("/api/v1/admin/roles", headers=headers)
        assert res_roles.status_code == 403

        # Accessing admin dashboard summary
        res_dash = await ac.get("/api/v1/admin/dashboard/summary", headers=headers)
        assert res_dash.status_code == 403


@pytest.mark.asyncio
async def test_document_upload_mime_type_validation():
    """Document upload must reject forbidden MIME types and executable files."""
    admin_token = await get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Uploading an executable shell script or HTML
        files = {
            "file": ("malicious.sh", b"#!/bin/bash\nrm -rf /", "application/x-sh")
        }
        res = await ac.post(
            "/api/v1/admin/documents/upload",
            headers=headers,
            data={"category": "general"},
            files=files,
        )
        assert res.status_code == 400
        assert "unsupported file type" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unauthenticated_document_download_rejection():
    """Document download endpoint must reject unauthenticated requests."""
    fake_doc_id = str(uuid.uuid4())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/documents/{fake_doc_id}/download")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_sql_injection_resilience_in_search():
    """Search queries with SQL injection payloads must be safely handled without SQL errors."""
    admin_token = await get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for payload in payloads:
            res = await ac.get(
                "/api/v1/admin/products",
                headers=headers,
                params={"search": payload},
            )
            assert res.status_code == 200
            data = res.json()
            assert "items" in data
            assert isinstance(data["items"], list)
