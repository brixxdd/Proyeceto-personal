#!/usr/bin/env bash
# deploy.sh — Full stack setup for Ubuntu Server
# Usage: sudo bash deploy.sh [--prod] [--domain api.yourdomain.com]
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
section() { echo -e "\n${BLUE}━━━ $* ━━━${NC}"; }

PROD=false
DOMAIN=""
for arg in "$@"; do
  [[ "$arg" == "--prod" ]]    && PROD=true
  [[ "$arg" == --domain=* ]]  && DOMAIN="${arg#--domain=}"
  [[ "$arg" == "--domain" ]]  && { shift; DOMAIN="${1:-}"; }
done

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_IP=$(curl -sf https://api.ipify.org || hostname -I | awk '{print $1}')

# ─── 1. System dependencies ───────────────────────────────────────────────────
section "1. System dependencies"
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg lsb-release openssl nginx

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
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.version.split(".")[0].replace("v",""))')" -lt 20 ]]; then
  info "Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  info "Node.js installed: $(node --version)"
else
  info "Node.js already installed: $(node --version)"
fi

# ─── 2. .env files ────────────────────────────────────────────────────────────
section "2. Environment files"

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
NODE_ENV_VAL=$([ "$PROD" = true ] && echo production || echo development)
LOG_LEVEL_VAL=$([ "$PROD" = true ] && echo info || echo debug)

write_env() {
  local file="$1"
  local content="$2"
  if [[ ! -f "$file" ]]; then
    echo "$content" > "$file"
    info "Created $file"
  else
    warn "Skipped $file (already exists — delete to regenerate)"
  fi
}

write_env "$PROJECT_DIR/services/auth-service/.env" \
"PORT=3002
NODE_ENV=$NODE_ENV_VAL
DATABASE_URL=postgresql://postgres:postgres@postgres-auth:5432/auth_db
REDIS_URL=redis://redis:6379
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d
LOG_LEVEL=$LOG_LEVEL_VAL"

write_env "$PROJECT_DIR/services/restaurant-service/.env" \
"PORT=3001
NODE_ENV=$NODE_ENV_VAL
DATABASE_URL=postgresql://postgres:postgres@postgres-restaurant:5432/restaurant_db
REDIS_URL=redis://redis:6379
LOG_LEVEL=$LOG_LEVEL_VAL"

write_env "$PROJECT_DIR/services/order-service/.env" \
"PORT=3000
NODE_ENV=$NODE_ENV_VAL
DATABASE_URL=postgresql://postgres:postgres@postgres-order:5432/order_db
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
JWT_SECRET=$JWT_SECRET
RESTAURANT_SERVICE_URL=http://restaurant-service:3001/graphql
LOG_LEVEL=$LOG_LEVEL_VAL"

write_env "$PROJECT_DIR/services/delivery-service/.env" \
"PORT=3003
NODE_ENV=$NODE_ENV_VAL
DATABASE_URL=postgresql://postgres:postgres@postgres-delivery:5432/delivery_db
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=delivery-service
KAFKA_GROUP_ID=delivery-service-group
LOG_LEVEL=$LOG_LEVEL_VAL"

write_env "$PROJECT_DIR/services/notification-service/.env" \
"PORT=3004
NODE_ENV=$NODE_ENV_VAL
DATABASE_URL=postgresql://postgres:postgres@postgres-notification:5432/notification_db
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=notification-service
KAFKA_GROUP_ID=notification-service-group
LOG_LEVEL=$LOG_LEVEL_VAL"

write_env "$PROJECT_DIR/services/api-gateway/.env" \
"PORT=4000
NODE_ENV=$NODE_ENV_VAL
AUTH_SERVICE_URL=http://auth-service:3002/graphql
RESTAURANT_SERVICE_URL=http://restaurant-service:3001/graphql
ORDER_SERVICE_URL=http://order-service:3000/graphql
REDIS_URL=redis://redis:6379
JWT_SECRET=$JWT_SECRET
LOG_LEVEL=$LOG_LEVEL_VAL"

# ─── 3. Patch Kafka advertised listeners for VPS ─────────────────────────────
section "3. Kafka — patch advertised listeners"
info "Server IP detected: $SERVER_IP"
# Replace localhost with actual server IP so external clients can reach Kafka
sed -i "s|PLAINTEXT://localhost:9092|PLAINTEXT://${SERVER_IP}:9092|g" \
  "$PROJECT_DIR/docker-compose.yaml"
info "Kafka ADVERTISED_LISTENERS patched to $SERVER_IP"

# ─── 4. Install npm dependencies ──────────────────────────────────────────────
section "4. npm dependencies"
for svc in auth-service restaurant-service order-service delivery-service notification-service api-gateway; do
  svc_dir="$PROJECT_DIR/services/$svc"
  if [[ -f "$svc_dir/package.json" ]]; then
    info "  npm ci — $svc"
    (cd "$svc_dir" && npm ci --silent)
  fi
done

# ─── 5. Build & start containers ──────────────────────────────────────────────
section "5. Build & start containers"
cd "$PROJECT_DIR"
docker compose build --parallel
docker compose up -d

# ─── 6. Wait for DBs ──────────────────────────────────────────────────────────
section "6. Waiting for databases"
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

# ─── 7. Run migrations ────────────────────────────────────────────────────────
section "7. Database migrations"
for svc in auth-service restaurant-service order-service delivery-service notification-service; do
  svc_dir="$PROJECT_DIR/services/$svc"
  if [[ -f "$svc_dir/package.json" ]]; then
    info "  migrate:up — $svc"
    case "$svc" in
      auth-service)         DB_PORT=5433; DB_NAME=auth_db ;;
      restaurant-service)   DB_PORT=5434; DB_NAME=restaurant_db ;;
      order-service)        DB_PORT=5435; DB_NAME=order_db ;;
      delivery-service)     DB_PORT=5436; DB_NAME=delivery_db ;;
      notification-service) DB_PORT=5437; DB_NAME=notification_db ;;
    esac
    (cd "$svc_dir" && \
      DATABASE_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/${DB_NAME}" \
      npm run migrate:up)
  fi
done

# ─── 8. Nginx reverse proxy ───────────────────────────────────────────────────
section "8. Nginx reverse proxy"

PUBLIC_HOST="${DOMAIN:-$SERVER_IP}"

cat > /etc/nginx/sites-available/food-delivery <<NGINX
server {
    listen 80;
    server_name ${PUBLIC_HOST};

    # API Gateway — GraphQL + WebSocket
    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Grafana
    location /grafana/ {
        proxy_pass         http://127.0.0.1:3010/;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
    }

    # Prometheus (restrict in prod)
    location /prometheus/ {
        proxy_pass         http://127.0.0.1:9090/;
        proxy_set_header   Host \$host;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/food-delivery /etc/nginx/sites-enabled/food-delivery
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
info "Nginx configured for $PUBLIC_HOST"

# ─── 9. SSL with Certbot (only if domain provided) ───────────────────────────
if [[ -n "$DOMAIN" ]]; then
  section "9. SSL — Certbot"
  if ! command -v certbot &>/dev/null; then
    apt-get install -y -qq certbot python3-certbot-nginx
  fi
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" \
    && info "SSL certificate issued for $DOMAIN" \
    || warn "Certbot failed — check DNS points to this server first"
else
  section "9. SSL — skipped (no --domain provided)"
  warn "To enable HTTPS later: certbot --nginx -d yourdomain.com"
fi

# ─── 10. Health checks ────────────────────────────────────────────────────────
section "10. Health checks"
sleep 8

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
  info "╔══════════════════════════════════════════╗"
  info "║       Deploy complete — all healthy      ║"
  info "╠══════════════════════════════════════════╣"
  info "║  GraphQL:    http://${PUBLIC_HOST}/graphql"
  info "║  Grafana:    http://${PUBLIC_HOST}/grafana"
  info "║  Prometheus: http://${PUBLIC_HOST}/prometheus"
  info "╚══════════════════════════════════════════╝"
else
  warn "Deploy done with warnings. Some services may still be starting."
  warn "Check: docker compose logs -f"
fi

if [[ "$PROD" == "true" ]]; then
  warn "━━━ SAVE THESE SECRETS ━━━"
  warn "JWT_SECRET=$JWT_SECRET"
  warn "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
fi
