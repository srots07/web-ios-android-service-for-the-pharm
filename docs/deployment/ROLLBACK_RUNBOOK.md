# ROLLBACK RUNBOOK
## Emergency Rollback & Degradation Protocol

This runbook outlines emergency recovery procedures in the event that a deployment exhibits regression, data corruption, or service degradation.

---

### 1. Trigger Criteria for Rollback

An emergency rollback must be initiated immediately if any of the following occur following a deployment:
- Error rates on core API routes (`/api/v1/*`) exceed 1% over 5 minutes.
- Database connection pool exhaustion or unhandled migration exceptions.
- API readiness probe (`/api/v1/health/ready`) persistently fails or returns HTTP 503.
- Critical authentication or order submission flows are non-functional.

---

### 2. Fast Rollback Procedure (Code / Container Layer)

If the database schema has not undergone backwards-incompatible DDL changes:

```bash
# 1. Checkout the previous known-good git commit or release tag
cd /opt/prime
git checkout <PREVIOUS_STABLE_COMMIT_SHA>

# 2. Re-deploy previous stable container images
docker compose -f infrastructure/deployment/docker-compose.production.yml \
  --env-file infrastructure/deployment/deployment.env \
  up -d --build --no-deps api web

# 3. Reload reverse proxy
docker exec -i prime-production-proxy nginx -s reload

# 4. Verify system health
curl -f http://127.0.0.1:8000/api/v1/health/ready
```

---

### 3. Deep Rollback Procedure (Database Schema Downgrade)

If the release introduced schema migrations that must be undone:

```bash
# 1. Downgrade Alembic schema to previous revision
docker exec -i prime-production-api alembic downgrade -1

# 2. If migration downgrade fails due to destructive operations, execute database snapshot restore:
./infrastructure/backup/restore.sh /var/backups/prime/postgres/pre_deploy_snapshot.sql.gz
```

---

### 4. Post-Rollback Review & Incident Reporting

1. Capture all container logs immediately:
   ```bash
   docker logs prime-production-api > /var/log/prime-incident-api.log
   docker logs prime-production-proxy > /var/log/prime-incident-proxy.log
   ```
2. Notify the engineering team and initiate a post-mortem review.

