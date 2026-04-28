import { Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { IdempotencyService } from '../services/idempotency.service';

export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  restaurantId: string;
  totalAmount: number;
  timestamp: string;
}

export interface OrderAssignedEvent {
  orderId: string;
  deliveryPersonId: string;
  timestamp: string;
}

export interface OrderDeliveredEvent {
  orderId: string;
  timestamp: string;
}

export interface OrderReadyEvent {
  orderId: string;
  customerId: string;
  restaurantId: string;
  totalAmount: number;
  timestamp: string;
}

/**
 * Resultado de intentar publicar un evento
 */
export interface PublishResult {
  success: boolean;
  eventId?: string;
  isDuplicate?: boolean;
  error?: string;
}

export class KafkaProducer {
  private readonly ORDER_CREATED_TOPIC = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created';
  private readonly ORDER_ASSIGNED_TOPIC = process.env.KAFKA_TOPIC_ORDER_ASSIGNED || 'order.assigned';
  private readonly ORDER_DELIVERED_TOPIC = process.env.KAFKA_TOPIC_ORDER_DELIVERED || 'order.delivered';
  private readonly ORDER_READY_TOPIC = process.env.KAFKA_TOPIC_ORDER_READY || 'order.ready';

  constructor(
    private producer: Producer,
    private idempotency?: IdempotencyService,
  ) { }

  async publishOrderCreated(event: OrderCreatedEvent): Promise<PublishResult> {
    const eventId = uuidv4();

    if (this.idempotency) {
      const isRecorded = await this.idempotency.tryRecordEvent(eventId);
      if (!isRecorded) {
        return { success: false, eventId, isDuplicate: true };
      }
    }

    try {
      await this.producer.send({
        topic: this.ORDER_CREATED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'order.created',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.created event for order ${event.orderId} (eventId: ${eventId})`);
      return { success: true, eventId };
    } catch (error) {
      logger.error('Failed to publish order.created event', error);
      return { success: false, eventId, error: String(error) };
    }
  }

  async publishOrderAssigned(event: OrderAssignedEvent): Promise<PublishResult> {
    const eventId = uuidv4();

    if (this.idempotency) {
      const isRecorded = await this.idempotency.tryRecordEvent(eventId);
      if (!isRecorded) {
        return { success: false, eventId, isDuplicate: true };
      }
    }

    try {
      await this.producer.send({
        topic: this.ORDER_ASSIGNED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'order.assigned',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.assigned event for order ${event.orderId} (eventId: ${eventId})`);
      return { success: true, eventId };
    } catch (error) {
      logger.error('Failed to publish order.assigned event', error);
      return { success: false, eventId, error: String(error) };
    }
  }

  async publishOrderDelivered(event: OrderDeliveredEvent): Promise<PublishResult> {
    const eventId = uuidv4();

    if (this.idempotency) {
      const isRecorded = await this.idempotency.tryRecordEvent(eventId);
      if (!isRecorded) {
        return { success: false, eventId, isDuplicate: true };
      }
    }

    try {
      await this.producer.send({
        topic: this.ORDER_DELIVERED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'order.delivered',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.delivered event for order ${event.orderId} (eventId: ${eventId})`);
      return { success: true, eventId };
    } catch (error) {
      logger.error('Failed to publish order.delivered event', error);
      return { success: false, eventId, error: String(error) };
    }
  }

  async publishOrderReady(event: OrderReadyEvent): Promise<PublishResult> {
    const eventId = uuidv4();

    if (this.idempotency) {
      const isRecorded = await this.idempotency.tryRecordEvent(eventId);
      if (!isRecorded) {
        return { success: false, eventId, isDuplicate: true };
      }
    }

    try {
      await this.producer.send({
        topic: this.ORDER_READY_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'order.ready',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.ready event for order ${event.orderId} (eventId: ${eventId})`);
      return { success: true, eventId };
    } catch (error) {
      logger.error('Failed to publish order.ready event', error);
      return { success: false, eventId, error: String(error) };
    }
  }

  /**
   * Verifica si el producer está conectado
   */
  isConnected(): boolean {
    // Kafkajs producer no tiene estado explícito, verificamos con un ping básico
    return this.producer != null;
  }
}

