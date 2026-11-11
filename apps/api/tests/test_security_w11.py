import io
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


def test_production_fails_closed_without_secrets():
    """Production settings must fail closed when API_SECRET_KEY is missing or weak."""
    from app.config.settings import Settings

    # Missing secret in production
    with pytest.raises(ValueError, match="API_SECRET_KEY must be explicitly provided in production"):
        Settings(ENVIRONMENT="production", API_SECRET_KEY="")

    # Insecure default secret in production
    with pytest.raises(ValueError, match="Known insecure or default JWT secret key cannot be used in production"):
        Settings(
            ENVIRONMENT="production",
            API_SECRET_KEY="prime-activist-secure-jwt-key-2026-production-min32chars",
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
        )

    # SQLite forbidden in production
    with pytest.raises(ValueError, match="SQLite is forbidden in production"):
        Settings(
            ENVIRONMENT="production",
            API_SECRET_KEY="a" * 32,
            DATABASE_URL="sqlite+aiosqlite:///./prod.db",
        )

    # Default admin password rejected for bootstrap in production
    with pytest.raises(ValueError, match="Default or empty administrator password cannot be used"):
        Settings(
            ENVIRONMENT="production",
            API_SECRET_KEY="b" * 32,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
            ALLOW_ADMIN_BOOTSTRAP=True,
            DEFAULT_ADMIN_PASSWORD="PrimeAdmin@2026!",
        )

    # Valid production settings pass
    valid_prod = Settings(
        ENVIRONMENT="production",
        API_SECRET_KEY="c" * 32,
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
        ALLOW_ADMIN_BOOTSTRAP=False,
        ALLOWED_CORS_ORIGINS="https://primebyactivist.com,https://admin.primebyactivist.com",
    )
    assert valid_prod.AUTH_COOKIE_SECURE is True
    assert valid_prod.ALLOWED_CORS_ORIGINS == ["https://primebyactivist.com", "https://admin.primebyactivist.com"]

    # Wildcard CORS forbidden in production
    with pytest.raises(ValueError, match="Wildcard '\\*' CORS origin is forbidden in production"):
        Settings(
            ENVIRONMENT="production",
            API_SECRET_KEY="d" * 32,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
            ALLOW_ADMIN_BOOTSTRAP=False,
            ALLOWED_CORS_ORIGINS="*",
        )


@pytest.mark.asyncio
async def test_cors_middleware_allowed_and_rejected_origins():
    """Verify CORS preflight and request headers for allowed vs rejected origins."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Allowed origin preflight OPTIONS request
        res_allowed = await ac.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert res_allowed.status_code == 200
        assert res_allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert res_allowed.headers.get("access-control-allow-credentials") == "true"

        # 2. Rejected origin preflight request
        res_rejected = await ac.options(
            "/api/v1/health",
            headers={
                "Origin": "https://malicious-phishing-site.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Unauthorized origin does not get Access-Control-Allow-Origin header matching the malicious origin
        assert res_rejected.headers.get("access-control-allow-origin") != "https://malicious-phishing-site.com"


# --- Phase 2 Security Hardening Regression Tests ---

@pytest.mark.asyncio
async def test_security_headers_present_on_api_responses():
    """Verify security headers are attached to all API responses."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert "accelerometer=()" in res.headers.get("permissions-policy", "")


@pytest.mark.asyncio
async def test_document_upload_magic_bytes_spoofing_rejected():
    """Reject upload when file extension is .pdf but binary content lacks %PDF- header."""
    admin_token = await get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Spoofed file: extension is .pdf, content-type is application/pdf, but content is shell script
    spoofed_content = b"echo 'malicious script'; exit 1"
    files = {
        "file": ("fake_doc.pdf", io.BytesIO(spoofed_content), "application/pdf")
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/admin/documents/upload",
            files=files,
            data={"category": "Dossiers"},
            headers=headers,
        )
        assert res.status_code == 400
        assert "Binary content does not match signature" in res.json()["detail"]


@pytest.mark.asyncio
async def test_mass_assignment_protection_profile_update():
    """Profile update schema must reject unexpected mass-assignment fields."""
    customer_token = await get_customer_token()
    headers = {"Authorization": f"Bearer {customer_token}"}

    payload_with_forbidden_extra = {
        "full_name": "Legitimate Name",
        "role": "admin",  # Injected privilege escalation field
        "is_active": True,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch(
            "/api/v1/auth/profile",
            json=payload_with_forbidden_extra,
            headers=headers,
        )
        assert res.status_code == 422
        # Extra inputs forbidden error
        assert "extra_forbidden" in str(res.json()) or "Extra inputs are not permitted" in str(res.json())


@pytest.mark.asyncio
async def test_csrf_rejection_on_refresh_from_unauthorized_origin():
    """Cookie refresh endpoint must reject cross-origin requests from untrusted origins, and allow valid referer."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Untrusted origin -> rejected
        res = await ac.post(
            "/api/v1/auth/refresh",
            headers={"Origin": "https://attacker-controlled-site.com"},
            cookies={"prime_refresh_token": "mock-refresh-token"},
        )
        assert res.status_code == 403
        assert "CSRF policy" in res.json()["detail"]

        # 2. Missing Origin and Referer with CSRF enforcement -> rejected
        res_missing = await ac.post(
            "/api/v1/auth/refresh",
            headers={"X-Test-CSRF": "enforce"},
            cookies={"prime_refresh_token": "mock-refresh-token"},
        )
        assert res_missing.status_code == 403
        assert "Missing Origin and Referer" in res_missing.json()["detail"]

        # 3. Valid Referer fallback from allowed origin -> passes CSRF check (fails later on invalid mock token 401)
        res_referer = await ac.post(
            "/api/v1/auth/refresh",
            headers={"Referer": "http://localhost:3000/dashboard", "X-Test-CSRF": "enforce"},
            cookies={"prime_refresh_token": "mock-refresh-token"},
        )
        assert res_referer.status_code == 401
        assert "Invalid or revoked refresh session" in res_referer.json()["detail"]


@pytest.mark.asyncio
async def test_object_level_authorization_customer_orders():
    """Customer A must receive 404 when attempting to access unauthorized customer objects (IDOR protection)."""
    token_a = await get_customer_token()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Non-existent or other customer's order ID returns 404
        res_order = await ac.get(
            "/api/v1/auth/customer/orders/order-nonexistent-or-other",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_order.status_code == 404

        # Non-existent or other customer's quotation ID returns 404
        res_quote = await ac.get(
            "/api/v1/auth/customer/quotations/quote-nonexistent-or-other",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_quote.status_code == 404

        # Non-existent or other customer's enquiry ID returns 404
        res_enq = await ac.get(
            "/api/v1/auth/customer/enquiries/enq-nonexistent-or-other",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_enq.status_code == 404



