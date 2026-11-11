# DATABASE BACKUP & RESTORE RUNBOOK
## Enterprise Disaster Recovery Protocol

This runbook outlines the operational procedures for backing up and restoring PostgreSQL databases and associated private document storage volumes.

---

### 1. Proposed Disaster Recovery Targets

| Metric | Target | Operational Rationale |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | $\le 6$ hours | Automated snapshots scheduled every 6 hours via cron |
| **RTO (Recovery Time Objective)** | $\le 30$ minutes | Automated shell restore streaming directly to containerized `psql` |

*(Note: Targets are proposed guidelines pending final infrastructure SLA sign-off).*

---

### 2. Automated Scheduled Backup Procedure

The backup script is located at [`infrastructure/backup/backup.sh`](file:///C:/khasim/infrastructure/backup/backup.sh).

#### Crontab Configuration
Add the following entry to the host root crontab (`crontab -e`):

```bash
# Run database and dossier snapshot every 6 hours
0 */6 * * * /opt/prime/infrastructure/backup/backup.sh >> /var/log/prime-backup.log 2>&1
```

#### What the Backup Captures
1. **PostgreSQL Dump:** An atomic, transactional `pg_dump` compressed with `gzip -9`.
2. **Regulatory Files:** An uncompressed tarball of `/app/storage/uploads` compressed via `gzip`.
3. **Retention Pruning:** Automatically deletes snapshots older than 30 days.

---

### 3. Step-by-Step Restoration Procedure

Restoration is performed via [`infrastructure/backup/restore.sh`](file:///C:/khasim/infrastructure/backup/restore.sh).

```bash
# 1. Ensure target deployment container is running
docker compose -f infrastructure/deployment/docker-compose.production.yml ps

# 2. Execute restoration script specifying snapshot path
./infrastructure/backup/restore.sh /var/backups/prime/postgres/prime_db_20261111_120000.sql.gz
```

#### Execution Stages
1. Prompts operator for manual confirmation to avoid inadvertent data destruction.
2. Terminates active client connections to the target database.
3. Drops and recreates the target database.
4. Streams the compressed SQL archive directly into `psql`.
5. Executes `alembic upgrade head` from the API container to guarantee migration consistency.

---

### 4. Restoration Verification Protocol

After executing a restore, run the following verification checks:

1. **Verify Database Connectivity:**
   ```bash
   curl -s http://127.0.0.1:8000/api/v1/health/ready | jq .
   # Expected output: {"status":"ready", "checks":{"database":"connected"}}
   ```
2. **Verify Record Counts:**
   Confirm user, product, order, and quotation counts match pre-incident audit metrics.

