/**
 * Centralized API Client Configuration
 * PRIME by Activist Enterprise Platform
 */

export const API_CONFIG = {
  // Uses same-origin Next.js proxy in the browser, or direct FastAPI URL in server context
  BASE_URL: typeof window !== "undefined" ? "" : process.env.API_BASE_URL || "http://127.0.0.1:8000",
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 2,
  UPLOAD_MAX_BYTES: 10 * 1024 * 1024, // 10MB
  ENDPOINTS: {
    // Auth & Profile
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    ME: "/api/auth/me",
    PROFILE: "/api/auth/profile",
    CHANGE_PASSWORD: "/api/auth/change-password",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    LOGOUT_ALL: "/api/auth/logout-all",
    CUSTOMER_ENQUIRIES: "/api/auth/customer/enquiries",
    CUSTOMER_ORDERS: "/api/auth/customer/orders",
    CUSTOMER_QUOTATIONS: "/api/auth/customer/quotations",

    // Public
    PRODUCTS: "/api/products",
    CATEGORIES: "/api/categories",
    CONTACT: "/api/contact",

    // Admin
    ADMIN_DASHBOARD: "/api/admin/dashboard/summary",
    ADMIN_USERS: "/api/admin/users",
    ADMIN_PRODUCTS: "/api/admin/products",
    ADMIN_ORDERS: "/api/admin/orders",
    ADMIN_QUOTATIONS: "/api/admin/quotations",
    ADMIN_ROLES: "/api/admin/roles",
    ADMIN_PERMISSIONS: "/api/admin/permissions",
    ADMIN_DOCUMENTS: "/api/admin/documents",
    ADMIN_ENQUIRIES: "/api/admin/enquiries",
    ADMIN_SETTINGS: "/api/admin/settings",
  },
} as const;

