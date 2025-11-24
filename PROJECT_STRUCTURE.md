# Estructura del Proyecto

## Organización de Repositorios

Este proyecto está organizado como un monorepo, pero puede dividirse fácilmente en repositorios separados por microservicio. La estructura recomendada para una organización GitHub sería:

```
food-delivery-platform/
├── platform/              # Monorepo principal (este repo)
├── infra-terraform/       # Repositorio de infraestructura
├── helm-charts/           # Repositorio de Helm charts
└── docs/                  # Repositorio de documentación (GitHub Pages)
```

### Repositorios por Microservicio (Alternativa)

Si se prefiere separar en repositorios independientes:

```
food-delivery-platform/
├── api-gateway/
├── auth-service/
├── restaurant-service/
├── order-service/
├── delivery-service/
├── notification-service/
├── infra-terraform/
├── helm-charts/
└── docs/
```

## Estructura de Directorios Actual

```
.
├── services/                    # Microservicios
│   ├── api-gateway/
│   │   └── schema.graphql       # Schema GraphQL consolidado
│   ├── auth-service/
│   ├── restaurant-service/
│   ├── order-service/
│   │   ├── Dockerfile
│   │   ├── Makefile
│   │   ├── package.json
│   │   └── src/
│   ├── delivery-service/
│   └── notification-service/
│
├── infrastructure/              # Infraestructura como Código
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── modules/
│           ├── vpc/
│           ├── eks/
│           ├── rds/
│           ├── msk/
│           └── elasticache/
│
├── helm-charts/                 # Helm Charts
│   └── order-service/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│
├── docs/                        # Documentación
│   ├── mkdocs.yml
│   ├── index.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── c4-context.md
│   │   ├── c4-containers.md
│   │   └── decisions/
│   ├── installation/
│   ├── api/
│   ├── observability/
│   ├── development/
│   └── devops/
│
├── scripts/                     # Scripts de utilidad
│   └── init-databases.sql
│
├── .github/                     # GitHub Actions
│   └── workflows/
│       └── order-service-ci.yml
│
├── docker-compose.yaml          # Desarrollo local
├── README.md
└── .gitignore
```

## Convenciones de Nomenclatura

### Servicios
- Nombres en kebab-case: `order-service`, `auth-service`
- Puerto base: 3000, 3001, 3002, etc.

### Base de Datos
- Nombres en snake_case: `auth_db`, `order_db`
- Una base de datos por microservicio

### Kubernetes
- Namespace: `food-delivery-platform`
- Labels: `app.kubernetes.io/name`, `app.kubernetes.io/instance`

### Terraform
- Módulos en `modules/`
- Variables con prefijo descriptivo
- Outputs documentados

## Estructura de un Microservicio

Cada microservicio sigue esta estructura estándar:

```
service-name/
├── src/
│   ├── index.ts              # Punto de entrada
│   ├── resolvers/            # GraphQL resolvers
│   ├── services/             # Lógica de negocio
│   ├── models/               # Modelos de datos
│   ├── repositories/         # Acceso a datos
│   ├── events/               # Eventos Kafka
│   └── utils/                # Utilidades
├── migrations/               # Migraciones de BD
├── tests/                    # Tests
├── Dockerfile
├── Makefile
├── package.json
├── tsconfig.json
└── .env.example
```

## Comandos Make Estándar

Cada servicio debe implementar estos comandos Make:

- `make install` - Instalar dependencias
- `make build` - Compilar
- `make run` - Ejecutar en desarrollo
- `make test` - Ejecutar tests
- `make lint` - Linter
- `make docker-build` - Construir imagen Docker
- `make docker-push` - Publicar imagen
- `make migrate` - Ejecutar migraciones

## Próximos Pasos

1. Implementar código de cada microservicio
2. Configurar CI/CD para todos los servicios
3. Crear Helm charts para servicios restantes
4. Configurar ArgoCD App-of-Apps
5. Implementar observabilidad completa

