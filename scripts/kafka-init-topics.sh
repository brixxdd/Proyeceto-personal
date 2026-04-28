#!/bin/bash
# kafka-init-topics.sh — Creates all required Kafka topics for the food-delivery platform.
# Idempotent: uses --if-not-exists so re-running never fails.

set -euo pipefail

KAFKA_BROKER="${KAFKA_BROKER:-localhost:9092}"
KAFKA_TOPICS_CMD="/usr/bin/kafka-topics"
MAX_ATTEMPTS=30
ATTEMPT=0

echo "[kafka-init] Waiting for Kafka broker at ${KAFKA_BROKER}..."

until ${KAFKA_TOPICS_CMD} --bootstrap-server "${KAFKA_BROKER}" --list > /dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "${ATTEMPT}" -ge "${MAX_ATTEMPTS}" ]; then
    echo "[kafka-init] ERROR: Kafka not ready after ${MAX_ATTEMPTS} attempts. Exiting." >&2
    exit 1
  fi
  echo "[kafka-init] Attempt ${ATTEMPT}/${MAX_ATTEMPTS} — broker not ready yet, retrying in 5s..."
  sleep 5
done

echo "[kafka-init] Kafka is ready. Creating topics..."

create_topic() {
  local topic="$1"
  local partitions="$2"
  local replication="$3"

  ${KAFKA_TOPICS_CMD} \
    --bootstrap-server "${KAFKA_BROKER}" \
    --create \
    --if-not-exists \
    --topic "${topic}" \
    --partitions "${partitions}" \
    --replication-factor "${replication}"

  echo "[kafka-init] Topic created (or already exists): ${topic}"
}

# ── Business topics ────────────────────────────────────────────────────────────
create_topic "order.created"            3 1
create_topic "order.assigned"           3 1
create_topic "order.delivered"          1 1
create_topic "order.cancelled"          3 1
create_topic "order.ready"              3 1
create_topic "delivery.assigned"        3 1
create_topic "delivery.status_changed"  1 1
create_topic "restaurant.created"       1 1
create_topic "menu.updated"             1 1
create_topic "notification.email"       2 1
create_topic "notification.sms"         2 1

# ── Dead Letter Queues ─────────────────────────────────────────────────────────
create_topic "order.created.dlq"        1 1
create_topic "order.cancelled.dlq"      1 1
create_topic "order.ready.dlq"          1 1
create_topic "delivery.assigned.dlq"    1 1

echo "[kafka-init] All topics created successfully."
exit 0
