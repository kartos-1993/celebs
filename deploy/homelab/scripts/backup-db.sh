#!/usr/bin/env bash
# ==============================================================================
# Automated PostgreSQL Backup Script with Retention Pruning
# Run via cron daily: 0 2 * * * /opt/celebs/scripts/backup-db.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/celebs/backups/postgres}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${BACKUP_DIR}/celebs_prod_${TIMESTAMP}.sql.gz"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting database dump to ${DUMP_FILE}..."

# Export compressed dump via docker exec
docker exec celebs-postgres pg_dump -U "${POSTGRES_USER:-celebs_admin}" "${POSTGRES_DB:-celebs_prod}" | gzip > "$DUMP_FILE"

# Keep only the last 7 daily backups (to fit within 70 GB SSD constraints)
find "$BACKUP_DIR" -name "celebs_prod_*.sql.gz" -type f -mtime +7 -delete

BACKUP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup successful (${BACKUP_SIZE}). Kept last 7 daily archives."
