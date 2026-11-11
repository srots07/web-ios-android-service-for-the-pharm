# PRODUCTION ENVIRONMENT GUIDE
## Configuration & Secrets Management

This document provides the canonical reference for all environment variables required to deploy and operate PRIME by Activist in a production environment.

---

### Variable Reference Table

| Variable Name | Component | Required | Purpose | Production Placeholder Example |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Web Frontend | YES | Sets Node execution mode to production optimizations | `production` |
| `PORT` | Web Frontend | YES | Internal HTTP listening port for Next.js standalone | `3000` |
| `NEXT_PUBLIC_APP_NAME` | Web Frontend | YES | Brand display name rendered in metadata and UI | `"PRIME by Activist"` |
| `NEXT_PUBLIC_API_URL` | Web Frontend | YES | Base path for API requests routed via reverse proxy | `/api/v1` |
| `ENVIRONMENT` | API Backend | YES | Triggers strict fail-closed production validations | `production` |
| `API_SECRET_KEY` | API Backend | YES | Cryptographic signing key for JWT tokens ($\ge 32$ chars) | `<openssl rand -hex 32>` |
| `JWT_ALGORITHM` | API Backend | YES | Symmetric encryption algorithm for session tokens | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | API Backend | YES | Lifetime of in-memory bearer access token | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | API Backend | YES | Lifetime of secure HTTP-only refresh cookie | `7` |
| `POSTGRES_DB` | Database | YES | Name of production PostgreSQL database | `prime_enterprise_production` |
| `POSTGRES_USER` | Database | YES | Administrative user for PostgreSQL connection | `prime_db_user` |
| `POSTGRES_PASSWORD` | Database | YES | Password for PostgreSQL user ($\ge 32$ chars) | `<cryptographically random>` |
| `DATABASE_HOST` | API Backend | YES | Hostname of PostgreSQL service within internal network | `postgres` |
| `DATABASE_PORT` | API Backend | YES | Port of PostgreSQL service within internal network | `5432` |
| `DATABASE_URL` | API Backend | YES | Async SQLAlchemy connection URI with credentials | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_HOST` | API Backend | YES | Hostname of Redis instance within internal network | `redis` |
| `REDIS_PORT` | API Backend | YES | Port of Redis instance within internal network | `6379` |
| `REDIS_PASSWORD` | Cache / Redis | YES | Auth password required for Redis access | `<cryptographically random>` |
| `ALLOW_ADMIN_BOOTSTRAP` | API Backend | NO | Enables first-boot administrator account provisioning | `false` (default: false) |
| `BOOTSTRAP_ADMIN_EMAIL` | API Backend | COND | Email address for initial super-admin account | `security-admin@primebyactivist.com` |
| `BOOTSTRAP_ADMIN_PASSWORD`| API Backend | COND | Strong password for bootstrap account ($\ge 16$ chars) | `<unique strong password>` |
| `AUTH_COOKIE_SECURE` | API Backend | YES | Enforces `Secure` flag on refresh cookies | `true` |
| `AUTH_COOKIE_SAMESITE` | API Backend | YES | SameSite cookie restriction (`lax` or `strict`) | `lax` |

---

### Secret Generation Commands

Before launching in production, generate high-entropy secrets using standard system utilities:

```bash
# 1. Generate API_SECRET_KEY (64 hex characters)
openssl rand -hex 32

# 2. Generate Database & Redis Passwords (32 alphanumeric characters)
openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32
```

### Safety Principles

1. **Zero Secret Storage in Version Control:** Never commit populated `.env` files.
2. **Fail-Closed Verification:** If `API_SECRET_KEY` is missing or under 32 characters in production, FastAPI will abort startup immediately.
3. **Admin Bootstrap Lockdown:** Set `ALLOW_ADMIN_BOOTSTRAP=false` immediately following initial installation.

