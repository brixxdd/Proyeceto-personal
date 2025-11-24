# Plataforma de Pedidos en Tiempo Real

Bienvenido a la documentación de la Plataforma de Pedidos en Tiempo Real, una solución cloud-native, distribuida y escalable inspirada en plataformas como Uber Eats.

## 🎯 Visión General

Esta plataforma permite a los usuarios realizar pedidos de comida mediante GraphQL mutations, mientras que los restaurantes reciben notificaciones en tiempo real de nuevos pedidos y los repartidores pueden ver y aceptar pedidos disponibles mediante suscripciones GraphQL.

## 🏗️ Arquitectura

El sistema está construido con una arquitectura de microservicios que incluye:

- **API Gateway**: Punto de entrada único con GraphQL
- **Auth Service**: Autenticación y autorización
- **Restaurant Service**: Gestión de restaurantes y menús
- **Order Service**: Gestión del ciclo de vida de pedidos
- **Delivery Service**: Asignación y seguimiento de repartidores
- **Notification Service**: Notificaciones en tiempo real

## 🛠️ Stack Tecnológico

- **Frontend**: React + GraphQL (Apollo Client)
- **Backend**: Node.js/Go microservicios
- **Base de datos**: PostgreSQL (una por microservicio)
- **Cache**: Redis
- **Event Streaming**: Apache Kafka
- **Contenedores**: Docker + Kubernetes
- **Infraestructura**: Terraform (AWS: EKS, RDS, MSK, ElastiCache)
- **Observabilidad**: Prometheus + Grafana
- **CI/CD**: GitHub Actions + ArgoCD

## 🚀 Inicio Rápido

### Requisitos Previos

- Docker y Docker Compose
- Node.js 20+ (para desarrollo local)
- kubectl (para despliegues en Kubernetes)
- Terraform 1.0+ (para infraestructura)

### Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/food-delivery-platform/platform.git
cd platform

# Levantar servicios con docker-compose
docker-compose up -d

# Verificar que todos los servicios estén corriendo
docker-compose ps
```

Para más detalles, consulta la [Guía de Instalación Local](installation/local-setup.md).

## 📚 Documentación

- [Arquitectura](architecture/overview.md) - Visión general de la arquitectura del sistema
- [Diagramas C4](architecture/c4-context.md) - Diagramas de contexto y contenedores
- [API GraphQL](api/graphql-schema.md) - Especificación completa del schema GraphQL
- [Guía de Observabilidad](observability/metrics.md) - Métricas, logs y tracing
- [CI/CD](devops/ci-cd.md) - Pipelines de integración y despliegue continuo

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee nuestra [Guía de Contribución](development/contributing.md) para más detalles.

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

