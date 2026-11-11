from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.documents import router as documents_router
from app.api.v1.enquiries import router as enquiries_router
from app.api.v1.orders import router as orders_router
from app.api.v1.products import router as products_router
from app.api.v1.quotations import router as quotations_router
from app.api.v1.roles import router as roles_router
from app.api.v1.settings import router as settings_router
from app.api.v1.users import router as users_router

api_router = APIRouter()

# Health check
@api_router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "core-api",
        "version": "1.0.0",
    }

# Mount Auth router under /api/v1/auth
api_router.include_router(auth_router)

# Mount Dashboard router under /api/v1
api_router.include_router(dashboard_router)

# Mount Categories router under /api/v1
api_router.include_router(categories_router)

# Mount Admin Documents router under /api/v1
api_router.include_router(documents_router)

# Mount Admin Users router under /api/v1
api_router.include_router(users_router)

# Mount Products router under /api/v1 (contains both /products and /admin/products)
api_router.include_router(products_router)

# Mount Orders router under /api/v1
api_router.include_router(orders_router)

# Mount Quotations router under /api/v1
api_router.include_router(quotations_router)

# Mount Roles & Permissions router under /api/v1
api_router.include_router(roles_router)

# Mount Enquiries router under /api/v1
api_router.include_router(enquiries_router)

# Mount Platform Settings router under /api/v1
api_router.include_router(settings_router)



