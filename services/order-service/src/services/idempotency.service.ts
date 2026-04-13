import { createClient } from 'redis';
import { logger } from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

/**
 * Servicio de idempotencia para eventos Kafka.
 *
 * Previene el procesamiento duplicado de eventos usando Redis para
 * trackear los event IDs que ya han sido procesados.
 *
 * Patrón: Antes de publicar un evento, registra su eventId en Redis con SET NX.
 * Si ya existe, el evento es duplicado y se rechaza.
 */
export class IdempotencyService {
  /** TTL para los event IDs en Redis (24 horas) */
  private readonly EVENT_TTL = 86400;

  constructor(private redisClient: RedisClient) {}

  /**
   * Verifica si un evento ya fue procesado y lo registra atómicamente.
   *
   * @param eventId - Identificador único del evento
   * @returns true si es la primera vez (proceder), false si es duplicado (rechazar)
   */
  async tryRecordEvent(eventId: string): Promise<boolean> {
    const key = this.getEventKey(eventId);

    try {
      // SET NX = solo set si NO existe (atómico)
      const result = await this.redisClient.set(key, '1', {
        EX: this.EVENT_TTL,
        NX: true,
      });

      if (result === 'OK') {
        logger.debug(`Evento registrado: ${eventId}`);
        return true;
      }

      // Ya existe → evento duplicado
      logger.warn(`Evento duplicado detectado: ${eventId}`);
      return false;
    } catch (error) {
      // Si Redis falla, permitimos el evento para no bloquear el sistema
      logger.error(`Error al verificar idempotencia para ${eventId}, permitiendo por seguridad`, error);
      return true;
    }
  }

  /**
   * Verifica si un evento ya fue procesado (sin registrarlo).
   *
   * @param eventId - Identificador único del evento
   * @returns true si ya fue procesado
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const key = this.getEventKey(eventId);

    try {
      const exists = await this.redisClient.get(key);
      return exists !== null;
    } catch (error) {
      logger.error(`Error al verificar estado de ${eventId}`, error);
      return false;
    }
  }

  private getEventKey(eventId: string): string {
    return `event:processed:${eventId}`;
  }
}
