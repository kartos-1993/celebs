#!/usr/bin/env bash
# ==============================================================================
# Host Hardening & Setup Script for Dell Inspiron 7577 (Ubuntu)
# Run as root or with sudo: sudo bash setup-host.sh
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script with sudo or as root." >&2
  exit 1
fi

echo "==> [1/6] Configuring laptop power management (ignore lid close)..."
mkdir -p /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/lid-switch.conf << 'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=no
EOF
systemctl restart systemd-logind

echo "==> [2/6] Masking sleep, suspend, and hibernate targets..."
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

echo "==> [3/6] Configuring 4 GB swap file & swappiness optimization..."
if ! swapon --show | grep -q "/swapfile"; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q "/swapfile" /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

cat > /etc/sysctl.d/99-homelab-server.conf << 'EOF'
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
sysctl --system > /dev/null

echo "==> [4/6] Limiting systemd-journald max log size to 500MB (protecting 70GB SSD)..."
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/maxsize.conf << 'EOF'
[Journal]
SystemMaxUse=500M
SystemKeepFree=5G
EOF
systemctl restart systemd-journald

echo "==> [5/6] Hardening Docker daemon with global log rotation (max 10MB x 3)..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

if systemctl is-active --quiet docker; then
  systemctl restart docker
fi

echo "==> [6/6] Configuring basic UFW firewall..."
apt-get update -qq && apt-get install -y -qq ufw fail2ban curl git htop jq
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw --force enable

echo "==> Host hardening complete! System is prepared for Celebs stack."
