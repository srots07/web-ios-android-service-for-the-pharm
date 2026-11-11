import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config.settings import settings
from app.database.session import init_db
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": settings.DEFAULT_ADMIN_EMAIL,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == settings.DEFAULT_ADMIN_EMAIL.lower()
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_login_invalid_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": settings.DEFAULT_ADMIN_EMAIL,
                "password": "WrongPassword123!",
            },
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_register_and_login():
    import uuid
    test_email = f"pharmacist_{uuid.uuid4().hex[:8]}@test-pharmacy.com"
    test_password = "SecurePassword2026!"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Pharmacist",
                "email": test_email,
                "password": test_password,
                "account_type": "Pharmacy / Retailer",
            },
        )
        assert reg_res.status_code == 201
        assert reg_res.json()["role"] == "customer"  # Customer role, not admin

        # 2. Login with newly registered user
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": test_password,
            },
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # 3. Get /me
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == test_email


@pytest.mark.asyncio
async def test_admin_dashboard_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login as admin
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": settings.DEFAULT_ADMIN_EMAIL,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
        admin_token = login_res.json()["access_token"]

        # Fetch dashboard summary
        dash_res = await ac.get(
            "/api/v1/admin/dashboard/summary",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert "users" in dash_data
        assert "products" in dash_data
        assert "inquiries" in dash_data
        assert dash_data["products"]["total"] >= 6
        assert dash_data["users"]["total"] >= 1
