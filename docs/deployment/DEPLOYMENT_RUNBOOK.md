# DEPLOYMENT RUNBOOK
## Production Provisioning & Release Operations

This runbook describes the standard operating procedures for deploying PRIME by Activist to a production host (Cloud VM or dedicated VPS).

---

### 1. Host System Requirements

- **Operating System:** Ubuntu 22.04 LTS / 24.04 LTS or Debian 12
- **Compute Resources:**
  - Minimum: 2 vCPU, 4 GB RAM, 40 GB NVMe Storage
  - Recommended: 4 vCPU, 8 GB RAM, 100 GB NVMe Storage
- **Prerequisites Installed:**
  - Docker Engine $\ge 24.0$
  - Docker Compose v2 plugin $\ge 2.20$
  - OpenSSL, curl, git, gzip

---

### 2. Initial Host Provisioning

```bash
# 1. Clone the repository to the production server
git clone https://github.com/srots07/web-ios-android-service-for-the-pharm.git /opt/prime
cd /opt/prime

# 2. Prepare production environment variables
cp infrastructure/deployment/deployment.env.example infrastructure/deployment/deployment.env
nano infrastructure/deployment/deployment.env # Populate cryptographically strong secrets

# 3. Provision SSL / TLS Certificates (Let's Encrypt / Certbot)
mkdir -p /etc/nginx/ssl/live
# Install fullchain.pem and privkey.pem to the SSL mount directory
```

---

### 3. Application Build and Launch

```bash
# 1. Build and start containers in detached mode
docker compose -f infrastructure/deployment/docker-compose.production.yml \
  --env-file infrastructure/deployment/deployment.env \
  up -d --build

# 2. Verify container statuses
docker compose -f infrastructure/deployment/docker-compose.production.yml ps

# 3. Execute database migrations (First Run)
docker exec -i prime-production-api alembic upgrade head

# 4. Check API readiness and health
curl -s http://127.0.0.1:8000/api/v1/health/ready
```

---

### 4. Zero-Downtime Rolling Update Procedure

To update the running deployment with a new verified release tag:

```bash
# 1. Fetch latest changes
git fetch origin main
git checkout <RELEASE_TAG>

# 2. Build updated images
docker compose -f infrastructure/deployment/docker-compose.production.yml build api web

# 3. Apply schema migrations
docker exec -i prime-production-api alembic upgrade head

# 4. Restart web and api containers sequentially
docker compose -f infrastructure/deployment/docker-compose.production.yml up -d --no-deps api
docker compose -f infrastructure/deployment/docker-compose.production.yml up -d --no-deps web

# 5. Reload Nginx configuration without dropping connections
docker exec -i prime-production-proxy nginx -s reload
```

