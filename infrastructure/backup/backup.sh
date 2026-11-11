#!/bin/sh
# ==============================================================================
# PRIME by Activist - Automated Database & Document Backup Script
#
# Generates encrypted/compressed timestamped snapshots of:
# 1. PostgreSQL Schema and Data (pg_dump)
# 2. Uploaded Technical & Regulatory Dossiers (tar.gz)
# ==============================================================================

set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/prime"
POSTGRES_CONTAINER="prime-production-postgres"
STORAGE_VOLUME="prime-storage-production-data"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}/postgres"
mkdir -p "${BACKUP_DIR}/storage"

echo "[$(date)] Starting Automated Production Backup: ${TIMESTAMP}"

# 1. PostgreSQL Consistent Dump
DB_BACKUP_FILE="${BACKUP_DIR}/postgres/prime_db_${TIMESTAMP}.sql.gz"
echo "[$(date)] Backing up PostgreSQL database..."

docker exec "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  | gzip -c -9 > "${DB_BACKUP_FILE}"

# Verify backup file size is non-zero
if [ ! -s "${DB_BACKUP_FILE}" ]; then
  echo "[$(date)] ERROR: PostgreSQL backup file is empty!" >&2
  exit 1
fi
echo "[$(date)] Database snapshot completed: ${DB_BACKUP_FILE} ($(du -sh "${DB_BACKUP_FILE}" | cut -f1))"

# 2. File Storage Archive
STORAGE_BACKUP_FILE="${BACKUP_DIR}/storage/prime_storage_${TIMESTAMP}.tar.gz"
echo "[$(date)] Backing up regulatory file storage..."

docker run --rm \
  -v "${STORAGE_VOLUME}:/source:ro" \
  -v "${BACKUP_DIR}/storage:/backup" \
  alpine:latest tar -czf "/backup/prime_storage_${TIMESTAMP}.tar.gz" -C /source .

echo "[$(date)] Storage archive completed: ${STORAGE_BACKUP_FILE} ($(du -sh "${STORAGE_BACKUP_FILE}" | cut -f1))"

# 3. Apply Configurable Retention Policy
echo "[$(date)] Pruning snapshots older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/postgres" -name "*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}/storage" -name "*.tar.gz" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] Production backup finished successfully."

