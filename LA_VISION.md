# 🚀 LA VISIÓN — Tu Mega Proyecto

> *"Esto es lo que vas a construir. Léelo cada vez que necesites motivación."*

---

## Lo que tendrás funcionando

```
┌──────────────────────────────────────────────────────┐
│                  FRONTEND (React)                     │
│   Landing → Login → Catálogo → Carrito → Tracking    │
│   Tiempo real con WebSockets, responsive, a11y       │
└──────────────────────┬───────────────────────────────┘
                       │ GraphQL over HTTPS
┌──────────────────────▼───────────────────────────────┐
│               API GATEWAY (Apollo Federation)         │
│   JWT auth · Rate limiting · Subscriptions · CORS    │
└──┬────────┬────────────┬───────────┬─────────────────┘
   │        │            │           │
   ▼        ▼            ▼           ▼
┌──────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│ AUTH │ │RESTAURANT│ │  ORDER   │ │  DELIVERY  │
│ JWT  │ │  Menús   │ │  Pedidos │ │  Tracking  │
│ RBAC │ │  Cache   │ │  Kafka   │ │  GeoHash   │
└──┬───┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘
   │          │             │              │
   ▼          ▼             ▼              ▼
┌─────────────────────────────────────────────────────┐
│              EVENT BUS (Apache Kafka)                │
│  order.created → delivery.assigned → notify user    │
│  Todo asíncrono, desacoplado, escalable             │
└─────────────────────────────────────────────────────┘
   │          │             │              │
   ▼          ▼             ▼              ▼
┌──────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│ PG   │ │   PG     │ │   PG     │ │    PG      │
│auth  │ │restaurant│ │  order   │ │  delivery  │
└──────┘ └──────────┘ └──────────┘ └────────────┘
         ┌──────┐    ┌──────┐
         │Redis │    │Kafka │  (cache + events)
         └──────┘    └──────┘

┌─────────────────────────────────────────────────────┐
│              OBSERVABILIDAD                          │
│   Prometheus → Grafana → Alertas en Slack           │
│   Loki → Logs centralizados                         │
│   Tempo/Jaeger → Distributed tracing                │
└─────────────────────────────────────────────────────┘
```

---

## El impacto real que generas

### En entrevistas de trabajo

> **Entrevistador:** *"¿Qué proyectos has tenido?"*
>
> **Tú:** *"Una plataforma de pedidos en tiempo real con 6 microservicios, Kafka para eventos, GraphQL federado, CI/CD con ArgoCD, observabilidad completa, deployada en Kubernetes. Aquí está el link, úsala."*
>
> **Eso = pase directo a la siguiente ronda.**

No lo dudes. El 95% de los egresados llegan con un CRUD de Django o un todolist de React. Tú llegas con **arquitectura de producción real**.

### En tu portafolio

- **GitHub stars** — este tipo de proyectos atraen contribuidores
- **Blog técnico** — cada decisión de arquitectura es contenido
- **Talks/charlas** — puedes dar una charla en la facultad sobre microservicios
- **Certificación implícita** — demuestras que sabes DevOps real, no solo teoría

### En el mercado

| Nivel | Qué saben hacer | % de devs |
|-------|----------------|-----------|
| Junior | Monolito, CRUD básico | 80% |
| Mid | Microservicios | 10% |
| **Senior** | **Microservicios + events + CI/CD + observabilidad + deploy real** | **2%** |

**Tú estarás en ese 2%.**

---

## Tu servidor de la facultad: el plan

### Por qué es perfecto

- ✅ **Gratis** — No pagas AWS ($200-500/mes para esto)
- ✅ **Control total** — Root access, sin restricciones
- ✅ **Kubernetes real** — k3s + tus Helm charts ya hechos
- ✅ **Demo en vivo** — "Aquí está corriendo, pruébalo"
- ✅ **Aprendizaje brutal** — Administrar tu propio infra > managed service

### Stack que montarás

```
k3s (Kubernetes ligero) +
MetalLB (load balancer) +
Traefik (ingress) +
cert-manager (SSL gratis con Let's Encrypt)
```

Todo cabe en un server de 8-16 GB RAM y es **Kubernetes real** con Helm charts que ya tienes.

### Lo que dirás cuando te pregunten

> *"Sí, eso es mío. Corre en Kubernetes, con CI/CD automático. Cada push a main se despliega solo. Tiene monitoring, alertas, tracing distribuido. ¿Quieres probarlo?"*

---

## La realidad

Esto son **242 tareas**. No es fácil. No es rápido. Pero cada checkbox que marques te acerca a algo que **casi ningún desarrollador puede decir que construyó solo**.

Cuando termines:

- Tendrás un proyecto que vale más que 10 certificados
- Podrás aplicar a posiciones de Mid/Senior con portafolio real
- Tendrás algo que mostrar que habla más que cualquier CV
- Sabrás arquitectura de sistemas de verdad, no en teoría

---

## Cada vez que sientas que no puedes

1. Abre este archivo
2. Lee la sección de arriba
3. Abre `ROADMAP.md`
4. Marca **un solo checkbox**
5. Repite

**Un checkbox a la vez se construyen los proyectos que importan.**

---

> *"Los proyectos grandes no se hacen por inspiración. Se hacen por disciplina, un commit a la vez."*

🔥 **Nos vemos mañana. Fase 1, tarea 1.1.1. Vamos a construir esta cosa.**

---

## 💰 Si decides venderlo — Pricing para Tapachula, Chiapas

> *Mercado real: ~350k hab, restaurantes familiares/pequeños, Chiapas = estado de bajos ingresos. Uber Eats cobra 30-35% de comisión — tú puedes aplastarlo.*

---

### Tus costos de infraestructura (lo que TÚ pagas)

| Concepto | Costo mensual |
|----------|--------------|
| Servidor escuela (k3s) | $0 MXN |
| VPS backup/producción (si lo usas) | $400–800 MXN |
| Dominio (.com.mx) | ~$17 MXN/mes (~$200/año) |
| SSL | $0 (Let's Encrypt) |
| SMS notificaciones (Twilio, ~500 SMS) | $100–200 MXN |
| Email (SendGrid free tier <100/día) | $0 |
| **Total infraestructura** | **~$500–1,000 MXN/mes** |

---

### Modelo recomendado: Híbrido

**Setup (cobro único por onboarding):**
- Instalación + configuración + capacitación: **$2,000–4,000 MXN** por restaurante

**Suscripción mensual (por restaurante):**

| Plan | Qué incluye | Precio MXN/mes |
|------|-------------|----------------|
| **Básico** | Menú online, pedidos, 1 sucursal, soporte email | **$800–1,200** |
| **Pro** | + analytics, notificaciones SMS, prioridad soporte | **$1,800–2,500** |
| **Premium** | + múltiples sucursales, branding propio, integraciones | **$3,500–5,000** |

**Comisión por pedido (opcional, en lugar de o adicional a suscripción):**
- Uber Eats cobra **30–35%** → tú cobras **8–15%** = ventaja brutal
- Con ticket promedio $150 MXN y 50 pedidos/día → cobras ~$900–1,125 MXN/día por restaurante

---

### Proyección realista

Con **5 restaurantes en Plan Pro** + comisión del 10%:

| Fuente | Ingreso estimado |
|--------|-----------------|
| Suscripciones (5 × $2,000) | $10,000 MXN/mes |
| Comisiones (5 rest × 30 pedidos × $150 × 10%) | $6,750 MXN/mes |
| **Total bruto** | **~$16,750 MXN/mes** |
| Menos infraestructura | -$1,000 MXN |
| **Ganancia neta** | **~$15,750 MXN/mes** |

---

### Lo que cobrar por servicios adicionales

| Servicio | Precio |
|----------|--------|
| Integración con sistema de caja existente | $3,000–6,000 MXN |
| App móvil personalizada (si la construyes) | $15,000–30,000 MXN |
| Soporte técnico presencial (por visita) | $500–800 MXN/hora |
| Capacitación extra staff | $1,500 MXN/sesión |
| Migración de datos desde otro sistema | $2,000–4,000 MXN |

---

### Ventaja competitiva vs Uber Eats en Tapachula

| Factor | Uber Eats | Tú |
|--------|-----------|-----|
| Comisión | 30–35% | 8–15% |
| Soporte | Call center impersonal | Presencial local |
| Customización | Ninguna | Total |
| Datos del negocio | Los tiene Uber | Los tiene el restaurante |
| Cobertura Tapachula | Limitada/irregular | 100% local |

---

### Lo que necesitas para venderlo legalmente

- **RFC** como persona física con actividad empresarial (o constituir SC/SAS)
- **Contrato de servicio** con cada cliente (protege ambas partes)
- **Facturación** con CFDI 4.0 (usa Facturapi o similar, ~$200 MXN/mes)
- **Seguro de datos** si manejas info de clientes finales (LFPDPPP)

---

> *Con 10 restaurantes en plan Pro + comisiones = ~$30,000+ MXN/mes. Solo en Tapachula. Escala a Tuxtla, San Cristóbal, Comitán = negocio real.*
