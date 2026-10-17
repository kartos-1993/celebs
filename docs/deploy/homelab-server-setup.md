# Dell Inspiron 7577 (Ubuntu) — Self-Hosted Production Server Guide

> **Hardware Target**: Dell Inspiron 7577 (Intel i5/i7 7th Gen, 8–16 GB RAM, 70 GB SSD partition)  
> **Workload**: Celebs Monorepo (Express API, BullMQ Background Worker, PostgreSQL 15, Redis 7, MinIO S3, Prometheus, cAdvisor, Node Exporter, Grafana, Dozzle)  
> **Security Model**: Zero open router ports, Cloudflare Tunnel ingress, UFW firewall, Docker daemon log rotation.

---

## Table of Contents

1. [Architectural Overview & Topology](#1-architectural-overview--topology)
2. [Phase 1: Laptop Hardware & Ubuntu OS Hardening](#2-phase-1-laptop-hardware--ubuntu-os-hardening)
3. [Phase 2: Docker Engine & 70 GB Storage Guardrails](#3-phase-2-docker-engine--70-gb-storage-guardrails)
4. [Phase 3: Directory Structure & Ready-to-Run Files](#4-phase-3-directory-structure--ready-to-run-files)
5. [Phase 4: Environment Variables (`.env.production`)](#5-phase-4-environment-variables-envproduction)
6. [Phase 5: Deploying Infrastructure & Database Migrations](#6-phase-5-deploying-infrastructure--database-migrations)
7. [Phase 6: Deploying Application & BullMQ Workers](#7-phase-6-deploying-application--bullmq-workers)
8. [Phase 7: Monitoring & Observability (Grafana + Prometheus + Dozzle)](#8-phase-7-monitoring--observability-grafana--prometheus--dozzle)
9. [Phase 8: Ingress & SSL with Cloudflare Tunnel (Zero Port-Forwarding)](#9-phase-8-ingress--ssl-with-cloudflare-tunnel-zero-port-forwarding)
10. [Phase 9: 70 GB Disk Maintenance, Backups & Runbooks](#10-phase-9-70-gb-disk-maintenance-backups--runbooks)

---

## 1. Architectural Overview & Topology

```
                              [ Internet Users / Clients ]
                                           │
                        Cloudflare Tunnel (TLS 1.3 Termination)
                                           │
                                ┌──────────▼──────────┐
                                │     cloudflared     │ (Local Systemd Daemon)
                                └──────────┬──────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │ :3000                      │ :3001                      │ :8888
       ┌──────▼──────┐              ┌──────▼──────┐              ┌──────▼──────┐
       │  celebs-api │              │   grafana   │              │   dozzle    │
       │  (Express)  │              │ (Dashboards)│              │ (Live Logs) │
       └──────┬──────┘              └──────▲──────┘              └─────────────┘
              │                            │
              │                            │ Scrapes (:9090)
              │                     ┌──────┴──────┐
              │                     │ prometheus  │
              │                     └───▲───────▲─┘
              │                         │       │
              │         ┌───────────────┘       └───────────────┐
              │         │ :9100                                 │ :8080
              │   ┌─────┴────────┐                        ┌─────┴────────┐
              │   │ node-exporter│                        │   cadvisor   │
              │   │ (Host CPU/HD)│                        │ (Docker Stats│
              │   └──────────────┘                        └──────────────┘
              │
    ┌─────────┴───────────────────────┐
    │                                 │
┌───▼─────────────┐           ┌───────▼─────────┐
│ celebs-postgres │           │   celebs-redis  │ (Cache, Locks & BullMQ)
│ (PostgreSQL 15) │           │     (Redis 7)   │
└─────────────────┘           └───────┬─────────┘
                                      │
                              ┌───────▼─────────┐
                              │  celebs-worker  │
                              │ (BullMQ Worker) │
                              └─────────────────┘
```

### Resource Allocation Budget (16 GB RAM / 70 GB SSD)

| Service                         | CPU Share     | RAM Target      | Disk Footprint (Capped)     |
| :------------------------------ | :------------ | :-------------- | :-------------------------- |
| **Ubuntu OS & System Services** | Baseline      | ~1.2 GB         | ~12 GB (Root FS + Packages) |
| **Swap Space**                  | —             | 4 GB file       | 4 GB                        |
| **PostgreSQL 15**               | Up to 2 cores | 1.0 – 2.0 GB    | 10 GB (Data volume + WAL)   |
| **Redis 7**                     | 0.5 cores     | 512 MB (capped) | 500 MB (AOF file)           |
| **MinIO (S3 Assets)**           | 0.5 cores     | 512 MB          | 15 GB (Asset uploads)       |
| **Celebs API (Express)**        | 1 core        | 512 MB – 1 GB   | 500 MB (Docker image)       |
| **Celebs Worker (BullMQ)**      | 1 core        | 512 MB – 1 GB   | Shared image                |
| **Prometheus (15d retention)**  | 0.5 cores     | 512 MB – 1 GB   | 3 GB                        |
| **Grafana**                     | 0.2 cores     | 256 MB          | 200 MB                      |
| **Node Exporter + cAdvisor**    | 0.2 cores     | 150 MB          | 50 MB                       |
| **Dozzle (Log Viewer)**         | 0.1 cores     | 50 MB           | In-memory stream            |
| **Safety Headroom**             | —             | ~4 GB free RAM  | **~24 GB Free Disk Space**  |

---

## 2. Phase 1: Laptop Hardware & Ubuntu OS Hardening

Laptops require explicit operating system overrides to prevent hardware sleep or suspension when the lid is closed or when idle.

### Step 1.1: Prevent Sleep on Lid Close

Edit the `systemd-logind` configuration:

```bash
sudo nano /etc/systemd/logind.conf
```

Ensure the following keys are set (uncomment if necessary):

```ini
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=no
```

Apply the changes immediately:

```bash
sudo systemctl restart systemd-logind
```

### Step 1.2: Mask Sleep, Suspend, and Hibernate Targets

Ensure Ubuntu never puts the machine to sleep even under thermal pressure:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### Step 1.3: Configure 4 GB Swap File

Swap prevents the kernel Out-Of-Memory (OOM) killer from dropping database processes during unexpected peak loads.

```bash
# Check existing swap
sudo swapon --show

# If none exists or too small, allocate 4 GB:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist in fstab:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize swappiness for server workloads (prefer RAM over swap):
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.d/99-swappiness.conf
```

### Step 1.4: Limit Systemd Journal Size

By default, `systemd-journald` can consume gigabytes of disk space on a 70 GB drive. Limit it to 500 MB:

```bash
sudo mkdir -p /etc/systemd/journald.conf.d
sudo bash -c 'cat > /etc/systemd/journald.conf.d/maxsize.conf << EOF
[Journal]
SystemMaxUse=500M
SystemKeepFree=5G
EOF'

sudo systemctl restart systemd-journald
```

### Step 1.5: Firewall Hardening (UFW)

```bash
sudo apt update && sudo apt install -y ufw curl git htop jq

# Configure defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH and local LAN access
sudo ufw allow 22/tcp comment 'SSH'

# If accessing within local Wi-Fi / Ethernet subnet:
sudo ufw allow from 192.168.0.0/16 to any port 3000 proto tcp comment 'Celebs API'
sudo ufw allow from 192.168.0.0/16 to any port 3001 proto tcp comment 'Grafana'
sudo ufw allow from 192.168.0.0/16 to any port 8888 proto tcp comment 'Dozzle'
sudo ufw allow from 192.168.0.0/16 to any port 9001 proto tcp comment 'MinIO Console'

sudo ufw enable
```

---

## 3. Phase 2: Docker Engine & 70 GB Storage Guardrails

### Step 2.1: Install Docker CE & Docker Compose V2

```bash
# Remove older unofficial packages
sudo apt remove -y docker docker-engine docker.io containerd runc

# Add official Docker repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable non-root docker commands
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2.2: Mandatory Global Log-Rotation Daemon Config

> [!CAUTION]
> Without this configuration, Docker containers write unbounded JSON logs to `/var/lib/docker/containers/*/*.log`. A chatty API or error loop can consume 30+ GB within days.

Create or edit `/etc/docker/daemon.json`:

```bash
sudo bash -c 'cat > /etc/docker/daemon.json << "EOF"
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF'

sudo systemctl restart docker
```

Every container now retains a maximum of **30 MB** (3 files × 10 MB) of logs regardless of output volume.

---

## 4. Phase 3: Directory Structure & Ready-to-Run Files

Create your deployment root under `/opt/celebs`:

```bash
sudo mkdir -p /opt/celebs/config/prometheus
sudo chown -R $USER:$USER /opt/celebs
cd /opt/celebs
```

Your production folder layout:

```
/opt/celebs/
├── .env.production
├── docker-compose.infra.yml
├── docker-compose.app.yml
├── config/
│   └── prometheus/
│       └── prometheus.yml
└── scripts/
    ├── backup-db.sh
    └── maintenance-prune.sh
```

### 4.1 Prometheus Scrape Configuration

Create `/opt/celebs/config/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'celebs-api'
    metrics_path: '/health'
    static_configs:
      - targets: ['api:3000']
```

### 4.2 Infrastructure Compose (`docker-compose.infra.yml`)

Create `/opt/celebs/docker-compose.infra.yml`:

```yaml
version: '3.8'

networks:
  celebs-net:
    name: celebs-net
    driver: bridge

volumes:
  postgres_prod_data:
  redis_prod_data:
  minio_prod_data:
  prometheus_data:
  grafana_data:

services:
  # ─── DATABASE: POSTGRESQL 15 ───────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: celebs-postgres
    restart: unless-stopped
    networks:
      - celebs-net
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-celebs_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-SuperSecretDbPassword123}
      POSTGRES_DB: ${POSTGRES_DB:-celebs_prod}
    ports:
      - '127.0.0.1:5432:5432'
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    command: >
      postgres 
      -c shared_buffers=512MB 
      -c effective_cache_size=1536MB 
      -c maintenance_work_mem=128MB 
      -c checkpoint_completion_target=0.9 
      -c wal_buffers=16MB 
      -c default_statistics_target=100 
      -c random_page_cost=1.1 
      -c work_mem=16MB
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── IN-MEMORY CACHE & BULLMQ QUEUES: REDIS 7 ──────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: celebs-redis
    restart: unless-stopped
    networks:
      - celebs-net
    command: >
      redis-server 
      --requirepass ${REDIS_PASSWORD:-SuperSecretRedisPassword123} 
      --maxmemory 512mb 
      --maxmemory-policy noeviction 
      --appendonly yes 
      --appendfsync everysec
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - redis_prod_data:/data
    healthcheck:
      test: ['CMD-SHELL', 'redis-cli -a $${REDIS_PASSWORD} ping | grep PONG']
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── S3 COMPATIBLE OBJECT STORAGE: MINIO ───────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: celebs-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    networks:
      - celebs-net
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minio_admin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-SuperSecretMinioPassword123}
    ports:
      - '9000:9000' # S3 API
      - '9001:9001' # Web Console
    volumes:
      - minio_prod_data:/data
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:9000/minio/health/live || exit 1']
      interval: 15s
      timeout: 5s
      retries: 5

  # ─── HARDWARE METRICS: NODE EXPORTER ───────────────────────────────────────
  node-exporter:
    image: prom/node-exporter:v1.7.0
    container_name: celebs-node-exporter
    restart: unless-stopped
    networks:
      - celebs-net
    pid: host
    volumes:
      - '/:/host:ro,rslave'
    command:
      - '--path.rootfs=/host'
    ports:
      - '127.0.0.1:9100:9100'

  # ─── CONTAINER METRICS: CADVISOR ───────────────────────────────────────────
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.49.1
    container_name: celebs-cadvisor
    restart: unless-stopped
    privileged: true
    networks:
      - celebs-net
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    ports:
      - '127.0.0.1:8080:8080'

  # ─── METRICS AGGREGATOR: PROMETHEUS ────────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: celebs-prometheus
    restart: unless-stopped
    networks:
      - celebs-net
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    volumes:
      - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - '127.0.0.1:9090:9090'

  # ─── DASHBOARDS: GRAFANA ───────────────────────────────────────────────────
  grafana:
    image: grafana/grafana:10.4.1
    container_name: celebs-grafana
    restart: unless-stopped
    networks:
      - celebs-net
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=GrafanaSecretPassword123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - '3001:3000'

  # ─── LIVE CONTAINER LOGS: DOZZLE ───────────────────────────────────────────
  dozzle:
    image: amir20/dozzle:latest
    container_name: celebs-dozzle
    restart: unless-stopped
    networks:
      - celebs-net
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - '8888:8080'
```

### 4.3 Application & Worker Compose (`docker-compose.app.yml`)

Create `/opt/celebs/docker-compose.app.yml`:

```yaml
version: '3.8'

networks:
  celebs-net:
    external: true

services:
  # ─── CELEBS API (EXPRESS) ──────────────────────────────────────────────────
  api:
    image: celebs-app:latest
    container_name: celebs-api
    restart: unless-stopped
    networks:
      - celebs-net
    env_file:
      - .env.production
    ports:
      - '3000:3000'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ['node', 'dist/main.js']

  # ─── CELEBS BACKGROUND WORKER (BULLMQ) ─────────────────────────────────────
  worker:
    image: celebs-app:latest
    container_name: celebs-worker
    restart: unless-stopped
    networks:
      - celebs-net
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ['node', 'dist/worker-main.js']
```

---

## 5. Phase 4: Environment Variables (`.env.production`)

Create `/opt/celebs/.env.production`:

```ini
# Core Environment
NODE_ENV=production
PORT=3000

# Database Connections (Internal Docker Network DNS: 'postgres')
DATABASE_URL="postgresql://celebs_admin:SuperSecretDbPassword123@postgres:5432/celebs_prod?schema=public&connection_limit=20"
DIRECT_URL="postgresql://celebs_admin:SuperSecretDbPassword123@postgres:5432/celebs_prod?schema=public"

# Redis Cache & BullMQ Connection (Internal Docker Network DNS: 'redis')
REDIS_HOST="redis"
REDIS_PORT=6379
REDIS_PASSWORD="SuperSecretRedisPassword123"
REDIS_URL="redis://:SuperSecretRedisPassword123@redis:6379"

# S3 / MinIO Storage Configuration
S3_ENDPOINT="http://minio:9000"
S3_REGION="us-east-1"
S3_BUCKET="celebs-media"
S3_ACCESS_KEY="minio_admin"
S3_SECRET_KEY="SuperSecretMinioPassword123"
S3_FORCE_PATH_STYLE=true

# Security Tokens & Secrets (Replace with random 64-char strings)
JWT_SECRET="e9f9c73a847b2c0192e4827d92847a98bce17823eac481928374a81729bca012"
SESSION_SECRET="471928acbde89271635418293aebfc7192837465192837465019283746192837"

# External URL for self-ping keepalive
RENDER_EXTERNAL_URL=""

# Sentry (Optional error monitoring)
# SENTRY_DSN=""
```

---

## 6. Phase 5: Deploying Infrastructure & Database Migrations

### Step 6.1: Start the Infrastructure Stack

```bash
cd /opt/celebs
docker compose -f docker-compose.infra.yml up -d
```

Verify health:

```bash
docker ps
```

Ensure `celebs-postgres`, `celebs-redis`, and `celebs-minio` show status `(healthy)`.

### Step 6.2: Build the Production Application Image

Clone the repo or pull updates on the laptop:

```bash
cd /opt/celebs
if [ ! -d "repo" ]; then
  git clone https://github.com/your-username/celebs.git repo
fi

cd repo
git pull origin main

# Build the production Docker image locally
docker build -t celebs-app:latest -f Dockerfile .
```

### Step 6.3: Run Prisma Migrations

Run `prisma migrate deploy` using an ephemeral container attached to the `celebs-net` network:

```bash
docker run --rm \
  --network celebs-net \
  --env-file /opt/celebs/.env.production \
  celebs-app:latest \
  npx prisma migrate deploy --schema src/db/schema.prisma
```

---

## 7. Phase 6: Deploying Application & BullMQ Workers

Start both API and Background Worker:

```bash
cd /opt/celebs
docker compose -f docker-compose.app.yml up -d
```

### Verifying Service Startup

1. **Verify API Health**:

   ```bash
   curl -i http://localhost:3000/health
   ```

   _Expected: HTTP 200 with DB & Redis health ok._

2. **Verify Worker Logs**:
   ```bash
   docker logs --tail 40 celebs-worker
   ```
   _Expected logs: "BullMQ Worker is active and listening to queues: asset-processing, mail-delivery, session-maintenance, order-maintenance"._

---

## 8. Phase 7: Monitoring & Observability (Grafana + Prometheus + Dozzle)

### 1. Live Container Logs via Dozzle

Open your browser to: `http://<laptop-ip>:8888`

- View streaming logs from `celebs-api`, `celebs-worker`, `postgres`, and `redis`.
- Real-time CPU and RAM utilization per container.
- Regex search and log export without SSH.

### 2. Metrics & Dashboards in Grafana

Open your browser to: `http://<laptop-ip>:3001`

- **Username**: `admin`
- **Password**: `GrafanaSecretPassword123` (from `.env.production`)

#### Connect Prometheus Data Source:

1. Navigate to **Administration > Data Sources > Add data source**.
2. Select **Prometheus**.
3. Set **Prometheus server URL**: `http://prometheus:9090`.
4. Click **Save & Test** (a green success notification will confirm connection).

#### Recommended Production Dashboards:

1. Go to **Dashboards > New > Import**.
2. Enter **`1860`** (Node Exporter Full):
   - Monitors physical laptop health: **CPU Temperature**, **Fan speeds**, **Core frequencies**, **SSD Disk usage on `/`**, and **RAM & Swap pressure**.
3. Enter **`14282`** (cAdvisor Docker Dashboard):
   - Monitors container resource usage, throttling, and memory leaks.

---

## 9. Phase 8: Ingress & SSL with Cloudflare Tunnel (Zero Port-Forwarding)

> [!IMPORTANT]
> Running a home server should **never** require opening ports 80/443 on your home router. Cloudflare Tunnel runs an outbound encrypted daemon (`cloudflared`) that securely routes traffic from Cloudflare's edge directly to your local containers.

### Step 9.1: Install `cloudflared` on Ubuntu

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb
```

### Step 9.2: Authenticate and Create Tunnel

```bash
cloudflared tunnel login
```

_Click the browser link provided in the terminal to authorize your domain._

Create the tunnel:

```bash
cloudflared tunnel create celebs-home-server
```

_Note down the Tunnel ID output (e.g., `3fa85f64-5717-4562-b3fc-2c963f66afa6`)._

### Step 9.3: Configure Ingress Rules

Create `/etc/cloudflared/config.yml`:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Paste (replacing `<TUNNEL-ID>` and `yourdomain.com`):

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  # API Public Traffic
  - hostname: api.yourdomain.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true

  # Grafana Monitoring (Can be protected with Cloudflare Zero Trust Access)
  - hostname: monitor.yourdomain.com
    service: http://localhost:3001

  # MinIO S3 Console
  - hostname: s3.yourdomain.com
    service: http://localhost:9001

  # Default Catch-all rule
  - service: http_status:404
```

### Step 9.4: Route DNS & Start as Service

```bash
cloudflared tunnel route dns celebs-home-server api.yourdomain.com
cloudflared tunnel route dns celebs-home-server monitor.yourdomain.com

sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Your API is now accessible securely at `https://api.yourdomain.com` with free automated SSL certificates and DDoS protection.

---

## 10. Phase 9: 70 GB Disk Maintenance, Backups & Runbooks

On a 70 GB drive, unattended backups and pruning are non-negotiable.

### 10.1 Automated Maintenance Script

Create `/opt/celebs/scripts/maintenance-prune.sh`:

```bash
sudo bash -c 'cat > /opt/celebs/scripts/maintenance-prune.sh << "EOF"
#!/usr/bin/env bash
set -euo pipefail

echo "[$(date)] Starting scheduled server maintenance..."

# 1. Clean dangling Docker images, volumes, and build cache
docker system prune -af --volumes=false

# 2. Reclaim PostgreSQL dead tuples
docker exec celebs-postgres vacuumdb -U celebs_admin -d celebs_prod -z -v

# 3. Clean APT cache and systemd logs older than 7 days
apt-get clean
journalctl --vacuum-time=7d

# 4. Check remaining disk space
AVAILABLE_GB=$(df -BG / | awk "NR==2 {print \$4}" | sed "s/G//")
echo "[$(date)] Maintenance complete. Available root disk space: ${AVAILABLE_GB} GB"

if [ "$AVAILABLE_GB" -lt 10 ]; then
  echo "WARNING: Disk space critically low (<10 GB remaining)!" >&2
fi
EOF'

sudo chmod +x /opt/celebs/scripts/maintenance-prune.sh
```

### 10.2 Automated Database Backup Script

Create `/opt/celebs/scripts/backup-db.sh`:

```bash
sudo bash -c 'cat > /opt/celebs/scripts/backup-db.sh << "EOF"
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/celebs/backups/postgres"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${BACKUP_DIR}/celebs_prod_${TIMESTAMP}.sql.gz"

echo "[$(date)] Backing up PostgreSQL database..."
docker exec celebs-postgres pg_dump -U celebs_admin celebs_prod | gzip > "$DUMP_FILE"

# Keep only the last 7 daily backups to respect the 70 GB disk budget
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +7 -delete

echo "[$(date)] Backup finished: $DUMP_FILE"
EOF'

sudo chmod +x /opt/celebs/scripts/backup-db.sh
```

### 10.3 Schedule Crontab Jobs

Open root crontab:

```bash
sudo crontab -e
```

Add the following schedule:

```cron
# Daily database backup at 2:00 AM
0 2 * * * /opt/celebs/scripts/backup-db.sh >> /var/log/celebs-backup.log 2>&1

# Weekly Sunday disk maintenance & Docker prune at 3:00 AM
0 3 * * 0 /opt/celebs/scripts/maintenance-prune.sh >> /var/log/celebs-maintenance.log 2>&1
```

---

## Verification & Troubleshooting Cheatsheet

| Task                          | Command                                                                 |
| :---------------------------- | :---------------------------------------------------------------------- | -------- | --------- |
| **Check All Containers**      | `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`        |
| **Check Live RAM & Swap**     | `free -h`                                                               |
| **Check Exact Disk Usage**    | `df -h /`                                                               |
| **Inspect Top Large Files**   | `sudo du -ahx /                                                         | sort -rh | head -20` |
| **Tail API Logs**             | `docker logs --tail 50 -f celebs-api`                                   |
| **Tail Worker Logs**          | `docker logs --tail 50 -f celebs-worker`                                |
| **Direct Postgres Shell**     | `docker exec -it celebs-postgres psql -U celebs_admin -d celebs_prod`   |
| **Direct Redis CLI**          | `docker exec -it celebs-redis redis-cli -a SuperSecretRedisPassword123` |
| **Restart Cloudflare Tunnel** | `sudo systemctl restart cloudflared`                                    |
