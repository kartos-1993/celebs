#!/usr/bin/env bash
# ==============================================================================
# Maintenance & Disk Prune Script for 70 GB SSD Host
# Run via cron weekly: 0 3 * * 0 /opt/celebs/scripts/maintenance-prune.sh
# ==============================================================================

set -euo pipefail

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting server maintenance & disk cleanup..."

# 1. Prune unused docker data (containers, networks, dangling images)
if command -v docker > /dev/null 2>&1; then
  docker system prune -af --volumes=false
fi

# 2. Reclaim PostgreSQL dead space & update planner statistics
if docker ps --format '{{.Names}}' | grep -q "celebs-postgres"; then
  docker exec celebs-postgres vacuumdb -U "${POSTGRES_USER:-celebs_admin}" -d "${POSTGRES_DB:-celebs_prod}" -z -v || true
fi

# 3. Clean APT package manager cache
if command -v apt-get > /dev/null 2>&1; then
  apt-get clean
fi

# 4. Clean systemd journal older than 7 days
if command -v journalctl > /dev/null 2>&1; then
  journalctl --vacuum-time=7d
fi

# 5. Check available disk space and alert if below 10 GB
AVAILABLE_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Maintenance complete. Available root disk: ${AVAILABLE_GB} GB"

if [ "$AVAILABLE_GB" -lt 10 ]; then
  echo "CRITICAL: Available disk space is below 10 GB on root filesystem!" >&2
fi
