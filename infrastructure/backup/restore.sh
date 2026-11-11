#!/bin/sh
# ==============================================================================
# PRIME by Activist - Disaster Recovery & Database Restoration Script
#
# Restores a timestamped PostgreSQL backup file into a target instance.
# Usage:
#   ./restore.sh /var/backups/prime/postgres/prime_db_20261111_120000.sql.gz
# ==============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <path-to-sql-gz-backup>" >&2
  exit 1
fi

BACKUP_FILE="$1"
POSTGRES_CONTAINER="prime-production-postgres"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file does not exist: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "==================================================================="
echo "PRIME by Activist - DISASTER RECOVERY RESTORATION"
echo "Target DB: ${POSTGRES_DB}"
echo "Source Snapshot: ${BACKUP_FILE}"
echo "==================================================================="

read -p "WARNING: This will drop existing schema and overwrite database contents. Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restoration aborted by operator."
  exit 0
fi

echo "[$(date)] Terminating active database connections..."
docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"

echo "[$(date)] Recreating database '${POSTGRES_DB}'..."
docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

echo "[$(date)] Streaming compressed snapshot to psql..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "[$(date)] Running Alembic verification check..."
docker exec -i prime-production-api alembic upgrade head

echo "[$(date)] Database restoration completed successfully!"

