# PRODUCTION ARCHITECTURE
## PRIME by Activist — Unified Enterprise Platform

```text
                                    CLIENTS / USERS
                                           |
                                      HTTPS (443)
                                           |
                                  +-----------------+
                                  |   DNS / DOMAIN  |
                                  | prime.domain.tld|
                                  +--------+--------+
                                           |
                            +--------------v--------------+
                            |     REVERSE PROXY (Nginx)   |
                            |  - TLS Termination          |
                            |  - Security Headers (HSTS)  |
                            |  - Rate Limiting (30r/s)    |
                            |  - Gzip / Static Cache      |
                            +-------+-------------+-------+
                                    |             |
                     /api/*         |             |  /*
             +----------------------+             +----------------------+
             |                                                           |
             v                                                           v
+--------------------------+                                +--------------------------+
|       API BACKEND        |                                |       WEB FRONTEND       |
|    FastAPI (Port 8000)   |                                |     Next.js (Port 3000)  |
|  - 4 Uvicorn Workers     |                                |  - Node.js Standalone    |
|  - In-Memory Auth Tokens |                                |  - App Router (30 routes)|
|  - Role-Based Access     |                                |  - Tailored UI Components|
|  - Regulatory Documents  |                                |  - Memory-Only Session   |
+------------+-------------+                                +--------------------------+
             |
             +-----------------------------+
             |                             |
             v                             v
+--------------------------+  +--------------------------+
|   TRANSACTION DATABASE   |  |   CACHE & EVENT QUEUE    |
|       PostgreSQL 16      |  |          Redis 7         |
|  - ACID Workflows        |  |  - Session Invalidation  |
|  - Encrypted At Rest     |  |  - Rate Limit Backing    |
|  - Private Network Only  |  |  - Append-Only Persistence|
|  - Alembic Migrations    |  +--------------------------+
+------------+-------------+
             |
             v
+--------------------------+
|  PRIVATE FILE STORAGE    |
|   /app/storage/uploads   |
|  - Encrypted Volume      |
|  - MIME-Validated PDFs   |
|  - Path Traversal Guard  |
+--------------------------+
```

### Network Topology & Isolation Tiers

1. **Public Tier (`prime-public-tier`):**
   - The only network with ports bound to the host interfaces (`80` and `443`).
   - Managed entirely by Nginx. Directly intercepts client traffic, performs SSL handshakes, and terminates TLS.

2. **Application Tier (`prime-app-tier`):**
   - Internal bridge network connecting Nginx to the Next.js frontend (`web:3000`) and FastAPI backend (`api:8000`).
   - Containers are identified via internal Docker DNS; neither port 3000 nor 8000 is exposed to the public Internet.

3. **Internal Data Tier (`prime-internal-tier`):**
   - Designated with `internal: true` in Docker Compose.
   - Air-gapped from outgoing or incoming Internet routing.
   - Hosts PostgreSQL 16 and Redis 7. Only the `api` container is connected to this network.

4. **Private Storage:**
   - Backed by Docker named volume `prime-storage-production-data`.
   - Accessible only by the `api` service under strict application authorization (`/api/v1/admin/documents`). Direct HTTP direct serving is blocked.

