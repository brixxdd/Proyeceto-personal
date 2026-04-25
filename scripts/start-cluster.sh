#!/usr/bin/env bash
# ============================================================
# FoodDash — Cluster Startup Script
# Levanta todo el cluster con wait logic para Kafka
# Uso: ./start-cluster.sh
# ============================================================

set -e

echo "🚀 FoodDash Cluster Startup"
echo "================================"

# 1. Levantar infrastructure crítica primero
echo "📦 Step 1: Levantando infraestructura (Postgres, Redis, Kafka)..."
docker-compose up -d \
  postgres-auth \
  postgres-restaurant \
  postgres-order \
  postgres-delivery \
  postgres-notification \
  redis \
  zookeeper \
  kafka

echo ""
echo "⏳ Esperando a que Kafka esté healthy (esto toma ~30-40s)..."

# Wait for Kafka to be healthy
MAX_RETRIES=30
RETRY_INTERVAL=2
retries=0

while [ $retries -lt $MAX_RETRIES ]; do
  if docker inspect --format='{{.State.Health.Status}}' food-delivery-kafka 2>/dev/null | grep -q "healthy"; then
    echo "✅ Kafka está healthy!"
    break
  fi
  retries=$((retries + 1))
  echo "  Intentando $retries/$MAX_RETRIES... (esperando ${RETRY_INTERVAL}s)"
  sleep $RETRY_INTERVAL
done

if [ $retries -eq $MAX_RETRIES ]; then
  echo "⚠️  Kafka no respondió en ${MAX_RETRIES}x${RETRY_INTERVAL}s, continuando de todos modos..."
fi

# 2. Levantar servicios del backend
echo ""
echo "🏗️  Step 2: Levantando servicios backend..."
docker-compose up -d \
  restaurant-service \
  auth-service \
  order-service \
  delivery-service \
  notification-service

# 3. Levantar API Gateway
echo ""
echo "🌐 Step 3: Levantando API Gateway..."
docker-compose up -d api-gateway

# 4. Levantar kafka-init (seed data)
echo ""
echo "📝 Step 4: Ejecutando seed de datos (kafka-init)..."
docker-compose up -d kafka-init

# 5. Levantar observabilidad
echo ""
echo "📊 Step 5: Levantando stack de observabilidad..."
docker-compose up -d \
  prometheus \
  alertmanager \
  grafana \
  loki \
  promtail \
  cadvisor \
  jaeger \
  adminer

echo ""
echo "================================"
echo "✅ Cluster iniciado!"
echo ""
echo "📍 URLs de servicios:"
echo "   Frontend (Vite)    : http://localhost:5173"
echo "   API Gateway (GQL) : http://localhost:4000/graphql"
echo "   Adminer           : http://localhost:8080"
echo "   Grafana           : http://localhost:3000 (admin/admin)"
echo "   Prometheus        : http://localhost:9090"
echo "   Jaeger            : http://localhost:16686"
echo "   Alertmanager     : http://localhost:9093"
echo ""
echo "📋 Para ver estado:     docker-compose ps"
echo "📋 Para ver logs:      docker-compose logs -f"
echo "📋 Para detener todo:   docker-compose down"
echo "================================"