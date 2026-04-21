#!/usr/bin/env bash
# deploy.sh — Full stack setup for Ubuntu Server
# Usage: sudo bash deploy.sh [--prod]
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

PROD=false
[[ "${1:-}" == "--prod" ]] && PROD=true

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ─── 1. System dependencies ───────────────────────────────────────────────────
info "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg lsb-release

# Docker
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  info "Docker installed: $(docker --version)"
else
  info "Docker already installed: $(docker --version)"
fi

# Node.js 20 LTS
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.version.split(\".\")[0].replace(\"v\",\"\"))')" -lt 20 ]]; then
  info "Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  info "Node.js installed: $(node --version)"
else
  info "Node.js already installed: $(node --version)"
fi

# ─── 2. .env files ────────────────────────────────────────────────────────────
info "Configuring environment files..."

# Generate random secrets if running in prod mode
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

write_env() {
  local file="$1"
  local content="$2"
  if [[ ! -f "$file" ]]; then
    echo "$content" > "$file"
    info "Created $file"
  else
    warn "Skipped $file (already exists)"
  fi
}

write_env "$PROJECT_DIR/services/auth-service/.env" \
"PORT=3002
NODE_ENV=$([ "$PROD" = true ] && echo production || echo development)
DATABASE_URL=postgresql://postgres:postgres@postgres-auth:5432/auth_db
REDIS_URL=redis://redis:6379
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d
LOG_LEVEL=$([ "$PROD" = true ] && echo info || echo debug)"

write_env "$PROJECT_DIR/services/restaurant-service/.env" \
"PORT=3001
NODE_ENV=$([ "$PROD" = true ] && echo production || echo development)
DATABASE_URL=postgresql://postgres:postgres@postgres-restaurant:5432/restaurant_db
REDIS_URL=redis://redis:6379
LOG_LEVEL=$([ "$PROD" = true ] && echo info || echo debug)"

write_env "$PROJECT_DIR/services/order-service/.env" \
"PORT=3000
NODE_ENV=$([ "$PROD" = true ] && echo production || echo development)
DATABASE_URL=postgresql://postgres:postgres@postgres-order:5432/order_db
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
JWT_SECRET=$JWT_SECRET
RESTAURANT_SERVICE_URL=http://restaurant-service:3001/graphql
LOG_LEVEL=$([ "$PROD" = true ] && echo info || echo debug)"

write_env "$PROJECT_DIR/services/delivery-service/.env" \
"PORT=3003
NODE_ENV=$([ "$PROD" = true ] && echo production || echo development)
DATABASE_URL=postgresql://postgres:postgres@postgres-delivery:5432/delivery_db
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=delivery-service
KAFKA_GROUP_ID=delivery-service-group
LOG_LEVEL=$([ "$PROD" = true ] && echo info || echo debug)"

write_env "$PROJECT_DIR/services/notification-service/.env" \
"PORT=3004
NODE_ENV=$([ "$PROD" = true ] && echo production || echo development)
DATABASE_URL=postgresql://postgres:postgres@postgres-notification:5432/notification_db
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=notification-service
KAFKA_GROUP_ID=notification-service-group
LOG_LEVEL=$([ "$PROD" = true ] && echo info || echo debug)"

# ─── 3. Install npm dependencies ──────────────────────────────────────────────
info "Installing npm dependencies for all services..."
for svc in auth-service restaurant-service order-service delivery-service notification-service api-gateway; do
  svc_dir="$PROJECT_DIR/services/$svc"
  if [[ -f "$svc_dir/package.json" ]]; then
    info "  npm ci — $svc"
    (cd "$svc_dir" && npm ci --silent)
  fi
done

# ─── 4. Build & start infrastructure ──────────────────────────────────────────
info "Building and starting all containers..."
cd "$PROJECT_DIR"
docker compose build --parallel
docker compose up -d

# ─── 5. Wait for DBs to be healthy ────────────────────────────────────────────
info "Waiting for PostgreSQL containers to be healthy..."
for container in \
  food-delivery-postgres-auth \
  food-delivery-postgres-restaurant \
  food-delivery-postgres-order \
  food-delivery-postgres-delivery \
  food-delivery-postgres-notification; do
  echo -n "  Waiting for $container..."
  until [[ "$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null)" == "healthy" ]]; do
    echo -n "."
    sleep 2
  done
  echo " ready"
done

# ─── 6. Run migrations ────────────────────────────────────────────────────────
info "Running database migrations..."
for svc in auth-service restaurant-service order-service delivery-service notification-service; do
  svc_dir="$PROJECT_DIR/services/$svc"
  if [[ -f "$svc_dir/package.json" ]]; then
    info "  migrate:up — $svc"
    # Migrations run against the service's own DB inside Docker via exposed ports
    # Override DATABASE_URL to use localhost + mapped port
    case "$svc" in
      auth-service)         DB_PORT=5433 ;;
      restaurant-service)   DB_PORT=5434 ;;
      order-service)        DB_PORT=5435 ;;
      delivery-service)     DB_PORT=5436 ;;
      notification-service) DB_PORT=5437 ;;
    esac
    DB_NAME="${svc//-/_}"
    DB_NAME="${DB_NAME/service/db}"
    (cd "$svc_dir" && \
      DATABASE_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/${DB_NAME}" \
      npm run migrate:up)
  fi
done

# ─── 7. Health check ──────────────────────────────────────────────────────────
info "Running health checks..."
sleep 5  # let services finish starting

fail=0
for port_path in "4000/health" "3000/health" "3001/health" "3002/health" "3003/health" "3004/health"; do
  if curl -sf "http://localhost:${port_path}" > /dev/null; then
    info "  ✓ http://localhost/${port_path}"
  else
    warn "  ✗ http://localhost/${port_path} — not responding yet"
    fail=1
  fi
done

echo ""
if [[ $fail -eq 0 ]]; then
  info "=== Deploy complete. All services healthy ==="
  info "API Gateway: http://localhost:4000/graphql"
else
  warn "=== Deploy complete with warnings. Some services may still be starting ==="
  warn "Check logs: docker compose logs -f"
fi

if [[ "$PROD" == "true" ]]; then
  warn "Production mode: JWT secrets were auto-generated. Save them if needed:"
  warn "  JWT_SECRET=$JWT_SECRET"
  warn "  JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
fi
