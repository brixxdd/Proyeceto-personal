# 🚀 Plataforma de Pedidos en Tiempo Real

Plataforma cloud-native, distribuida y escalable inspirada en Uber Eats, utilizando arquitectura de microservicios y tecnologías modernas de DevOps.

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación Local](#instalación-local)
- [Documentación](#documentación)
- [CI/CD](#cicd)

## 🏗️ Arquitectura

El sistema está compuesto por los siguientes microservicios:

- **api-gateway**: Gateway GraphQL unificado
- **auth-service**: Autenticación y autorización
- **restaurant-service**: Gestión de restaurantes y menús
- **order-service**: Gestión de pedidos
- **delivery-service**: Asignación y seguimiento de repartidores
- **notification-service**: Notificaciones en tiempo real

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

## 📁 Estructura del Proyecto

```
.
├── services/              # Microservicios
│   ├── api-gateway/
│   ├── auth-service/
│   ├── restaurant-service/
│   ├── order-service/
│   ├── delivery-service/
│   └── notification-service/
├── infrastructure/        # Terraform modules
├── helm-charts/          # Helm charts por servicio
├── docs/                 # Documentación (mkdocs)
├── docker-compose.yaml   # Desarrollo local
└── .github/              # GitHub Actions workflows
```

## 🚀 Instalación Local

Ver [Guía de Instalación Local](docs/installation/local-setup.md)

## 📚 Documentación

La documentación completa está disponible en `/docs` y puede ser servida con mkdocs:

```bash
cd docs
mkdocs serve
```

## 🔄 CI/CD

Los pipelines de CI/CD están configurados en `.github/workflows/` y utilizan ArgoCD para despliegues automáticos.

