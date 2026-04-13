# Qwen Code - Contexto del Proyecto

## Información del proyecto
- **Nombre:** `Proyeceto-personal` — Plataforma de Pedidos en Tiempo Real
- **Ruta:** `/home/brixxdd/Proyeceto-personal`
- **Descripción:** Plataforma cloud-native distribuida y escalable inspirada en Uber Eats, con arquitectura de microservicios

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React + GraphQL (Apollo Client) |
| **Backend** | Node.js / Go microservicios |
| **Bases de datos** | PostgreSQL (una por microservicio) |
| **Cache** | Redis |
| **Event Streaming** | Apache Kafka |
| **Contenedores** | Docker + Kubernetes |
| **Infraestructura** | Terraform (AWS: EKS, RDS, MSK, ElastiCache) |
| **Observabilidad** | Prometheus + Grafana |
| **CI/CD** | GitHub Actions + ArgoCD |

---

## Microservicios

| Servicio | Descripción |
|----------|-------------|
| **api-gateway** | Gateway GraphQL unificado |
| **auth-service** | Autenticación y autorización |
| **restaurant-service** | Gestión de restaurantes y menús |
| **order-service** | Gestión de pedidos |
| **delivery-service** | Asignación y seguimiento de repartidores |
| **notification-service** | Notificaciones en tiempo real |

---

## Estructura del Proyecto

```
.
├── services/              # Microservicios
├── infrastructure/        # Terraform modules
├── helm-charts/          # Helm charts por servicio
├── docs/                 # Documentación (mkdocs)
├── docker-compose.yaml   # Desarrollo local
├── .github/              # GitHub Actions workflows
├── scripts/              # Scripts auxiliares
└── QWEN.md              # Contexto del proyecto (este archivo)
```

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `docker-compose up` | Levantar servicios locales |
| `cd docs && mkdocs serve` | Servir documentación |
| `/review` | Revisar código por correctness, seguridad, calidad |
| `/qc-helper` | Preguntar sobre configuración de Qwen Code |
| `/loop 5m <prompt>` | Ejecutar un prompt en un schedule |

---

## Contexto del desarrollador

- **OS:** CachyOS (Arch Linux-based)
- **Shell:** Zsh con Oh My Zsh
- **Obsidian Vault:** `/home/brixxdd/Documentos/Obsidian Vault`

---

## MCP Servers configurados

| MCP | Estado | Notas |
|-----|--------|-------|
| **github** | ✅ | Token en `env.GITHUB_TOKEN` |
| **context7** | ✅ | API key en `env.CONTEXT7_API_KEY` |
| **sequential-thinking** | ✅ | Sin auth |
| **obsidian** | ✅ | Vault configurado |

---

## Skills Instaladas (12 total)

### Globales (raíz del proyecto)
| Skill | Fuente | Ubicación |
|-------|--------|-----------|
| accessibility | addyosmani/web-quality-skills | `.agents/skills/` |
| frontend-design | anthropics/skills | `.agents/skills/` |
| seo | addyosmani/web-quality-skills | `.agents/skills/` |

### Infrastructure/Terraform
| Skill | Fuente | Ubicación |
|-------|--------|-----------|
| terraform-style-guide | hashicorp | `infrastructure/terraform/.agents/skills/` |
| refactor-module | hashicorp | `infrastructure/terraform/.agents/skills/` |
| terraform-stacks | hashicorp | `infrastructure/terraform/.agents/skills/` |
| terraform-module-library | wshobson | `infrastructure/terraform/.agents/skills/` |

### Order Service
| Skill | Fuente | Ubicación |
|-------|--------|-----------|
| nodejs-backend-patterns | autoskills | `services/order-service/.agents/skills/` |
| nodejs-express-server | autoskills | `services/order-service/.agents/skills/` |
| nodejs-best-practices | autoskills | `services/order-service/.agents/skills/` |
| typescript-advanced-types | autoskills | `services/order-service/.agents/skills/` |

### Auth Service
| Skill | Fuente | Ubicación |
|-------|--------|-----------|
| typescript-advanced-types | autoskills | `services/auth-service/.agents/skills/` |

---

## Estado Actual del Proyecto (al 2026-04-11)

| Componente | Progreso | Notas |
|------------|----------|-------|
| order-service | ~90% | Código completo, sin tests, JWT stub |
| auth-service | ~30% | Skeleton, resolvers son stubs |
| restaurant-service | 0% | No existe |
| delivery-service | 0% | No existe |
| notification-service | 0% | No existe |
| api-gateway | ~10% | Solo schema.graphql |
| Terraform | 100% | 5 módulos AWS completos |
| Helm charts | ~17% | Solo order-service |
| CI/CD | ~17% | Solo order-service |
| Documentación | ~60% | Faltan observabilidad, devops, desarrollo |
| Tests | 0% | Cero archivos de test |
| Frontend | 0% | No existe app React |

**Progreso Total: ~35%**
