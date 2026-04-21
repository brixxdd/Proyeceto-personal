# Testing Guide

## Estado actual de tests

| Servicio             | Tests | Coverage | Suite |
|----------------------|-------|----------|-------|
| auth-service         | 37    | 100%     | unit  |
| restaurant-service   | 61    | ~90%     | unit + integration |
| api-gateway          | 22    | 100%     | unit  |
| delivery-service     | 48    | ~82%     | unit  |
| notification-service | 33    | 100%     | unit  |
| order-service        | —     | —        | pendiente |

---

## Correr tests por servicio

```bash
# Desde la raíz del repo, entrar al servicio:
cd services/<nombre-del-servicio>

# Instalar dependencias si es la primera vez
npm install

# Correr todos los tests
npm test

# Con tabla de coverage
npm test -- --coverage

# Modo watch (re-corre al guardar)
npm test -- --watch

# Un archivo específico
npm test -- tests/unit/delivery.service.test.ts

# Verbose (muestra cada test)
npm test -- --verbose
```

## Correr todos los servicios con tests de una sola vez

```bash
# Desde la raíz del repo
for svc in auth-service restaurant-service api-gateway delivery-service notification-service; do
  echo "=== $svc ==="
  (cd services/$svc && npm test -- --no-coverage 2>&1 | grep -E "Tests:|PASS|FAIL|✓|✗")
done
```

O uno por uno con coverage:

```bash
(cd services/delivery-service && npm test -- --coverage)
(cd services/notification-service && npm test -- --coverage)
(cd services/restaurant-service && npm test -- --coverage)
(cd services/auth-service && npm test -- --coverage)
(cd services/api-gateway && npm test -- --coverage)
```

---

## Estructura de tests

Cada servicio sigue el mismo patrón:

```
services/<name>/
├── jest.config.js          # Config Jest + ts-jest
├── tests/
│   ├── setup.ts            # Variables de entorno para tests
│   ├── __mocks__/          # Mocks manuales (ej. uuid ESM shim)
│   └── unit/
│       ├── *.service.test.ts
│       ├── *.repository.test.ts
│       └── kafka.consumer.test.ts
```

### Qué mockea cada suite

**delivery-service**
- `delivery.service.test.ts` — mockea `DeliveryRepository`, `KafkaProducer`, `RedisPubSub`, y métricas Prometheus
- `delivery.repository.test.ts` — mockea `pg.Pool` directamente (tests de queries SQL)
- `kafka.consumer.test.ts` — mockea `KafkaJS Consumer` capturando el handler `eachMessage`

**notification-service**
- `notification.service.test.ts` — mockea `pg.Pool` y `RedisPubClient`; usa shim CJS para `uuid` v13 (ESM)
- `kafka.consumer.test.ts` — mockea `kafkajs` completo vía `jest.mock`, más `email.provider` y `sms.provider`

**restaurant-service**
- `unit/restaurant.service.test.ts` — mockea `pg.Pool` y `redis.createClient`
- `unit/resolvers.test.ts` — tests de resolvers GraphQL

**auth-service**
- Tests de register, login, logout, refreshToken, rate limiting

---

## Requisitos

No hace falta levantar Docker para los tests unitarios — todo está mockeado.

Los tests de integración de `restaurant-service` (carpeta `integration/`) sí requieren PostgreSQL y Redis corriendo:

```bash
docker-compose up -d postgres redis
cd services/restaurant-service && npm test
```

---

## Notas de configuración

- **uuid v13 (ESM)**: notification-service usa un shim CJS en `tests/__mocks__/uuid.js` para compatibilidad con Jest CommonJS
- **Prometheus**: los contadores/gauges se mockean en todos los tests para evitar conflictos de registro entre suites
- **Kafka**: nunca se conecta a un broker real en tests — el Consumer/Producer se inyecta como dependencia y se mockea
