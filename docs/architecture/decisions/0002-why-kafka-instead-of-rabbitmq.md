# ADR-0002: Por qué Kafka en vez de RabbitMQ

## Status
Accepted

## Context
Necesitamos un sistema de mensajería para comunicación asíncrona entre microservicios. Las opciones principales son Apache Kafka y RabbitMQ.

## Decision
Elegimos Apache Kafka como sistema de event streaming.

## Rationale

### Ventajas de Kafka:
1. **Event Streaming**: Kafka está diseñado para event streaming, no solo mensajería. Esto permite:
   - Replay de eventos históricos
   - Múltiples consumidores independientes (consumer groups)
   - Retención de eventos por tiempo/espacio configurable

2. **Escalabilidad**: Kafka escala horizontalmente de forma nativa, manejando millones de mensajes por segundo.

3. **Durabilidad**: Los eventos se persisten en disco, permitiendo recuperación ante fallos.

4. **Ecosistema**: Integración con herramientas de observabilidad, procesamiento de streams (Kafka Streams, KSQL), y conectores.

5. **Cloud Native**: MSK (Managed Kafka Service) en AWS simplifica la gestión operativa.

### Desventajas consideradas:
- Mayor complejidad operativa (mitigada con MSK)
- Overhead para casos de uso simples (aceptable dado el volumen esperado)

## Consequences
- Usaremos MSK (Managed Streaming for Kafka) en AWS
- Implementaremos idempotencia en los consumidores
- Configuraremos DLQ (Dead Letter Queue) para mensajes fallidos
- Usaremos consumer groups para distribución de carga

## Alternatives Considered
- **RabbitMQ**: Mejor para colas de tareas, pero menos adecuado para event streaming
- **AWS SQS/SNS**: Más simple pero menos funcionalidad para event streaming
- **NATS**: Ligero pero menos maduro para casos de uso enterprise

