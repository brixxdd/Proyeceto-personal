import { createClient } from 'redis';
import { logger } from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

/**
 * Servicio de idempotencia para eventos Kafka.
 *
 * Previene el procesamiento duplicado de eventos usando Redis para
 * trackear los event IDs que ya han sido procesados.
 */
export class IdempotencyService {
  /** TTL para los event IDs en Redis (24 horas) */
  private readonly EVENT_TTL = 86400;

  constructor(private redisClient: RedisClient) {}

  /**
   * Registra un evento atómicamente.
   * @returns true si es la primera vez (proceder), false si es duplicado (rechazar)
   */
  async tryRecordEvent(eventId: string): Promise<boolean> {
    const key = this.getEventKey(eventId);

    try {
      const result = await this.redisClient.set(key, '1', {
        EX: this.EVENT_TTL,
        NX: true,
      });

      if (result === 'OK') {
        logger.debug(`Evento registrado: ${eventId}`);
        return true;
      }

      logger.warn(`Evento duplicado detectado: ${eventId}`);
      return false;
    } catch (error) {
      logger.error(`Error al verificar idempotencia para ${eventId}, permitiendo por seguridad`, error);
      return true;
    }
  }

  private getEventKey(eventId: string): string {
    return `event:processed:${eventId}`;
  }
}
