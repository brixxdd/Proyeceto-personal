# Guía de Instalación Local

Esta guía te ayudará a configurar y ejecutar la plataforma de pedidos en tu máquina local para desarrollo.

## Requisitos Previos

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 20.x (para desarrollo de servicios)
- **Make**: Para ejecutar comandos simplificados

## Instalación con Docker Compose

### 1. Clonar Repositorio

```bash
git clone https://github.com/food-delivery-platform/platform.git
cd platform
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y ajusta según necesites:

```bash
cp .env.example .env
```

### 3. Levantar Servicios

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar estado
docker-compose ps
```

### 4. Ejecutar Migraciones

```bash
# Para cada servicio
cd services/order-service
make migrate

cd ../restaurant-service
make migrate

# ... etc
```

### 5. Verificar Instalación

```bash
# Health checks
curl http://localhost:3000/health  # Order Service
curl http://localhost:3001/health  # Restaurant Service
curl http://localhost:4000/graphql # API Gateway
```

## Desarrollo Local de Servicios

### Configuración de un Servicio

```bash
cd services/order-service

# Instalar dependencias
make install

# Ejecutar en modo desarrollo
make run

# Ejecutar tests
make test
```

### Variables de Entorno por Servicio

Cada servicio requiere un archivo `.env`:

```env
# .env para order-service
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/order_db
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
```

## Estructura de Servicios Locales

```
localhost:4000  → API Gateway (GraphQL)
localhost:3000  → Order Service
localhost:3001 → Restaurant Service
localhost:3002 → Auth Service
localhost:3003 → Delivery Service
localhost:3004 → Notification Service
localhost:5432 → PostgreSQL (múltiples bases de datos)
localhost:6379 → Redis
localhost:9092 → Kafka
```

## Troubleshooting

### Puerto ya en uso

```bash
# Ver qué proceso usa un puerto
lsof -i :3000

# Cambiar puerto en docker-compose.yaml
```

### Base de datos no conecta

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Ver logs
docker-compose logs postgres
```

### Kafka no inicia

```bash
# Verificar logs de Kafka
docker-compose logs kafka

# Reiniciar servicios
docker-compose restart kafka zookeeper
```

## Próximos Pasos

- [Guía de Desarrollo](development/contributing.md)
- [API GraphQL](api/graphql-schema.md)
- [Despliegue en Kubernetes](installation/kubernetes-deployment.md)

