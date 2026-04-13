import { Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { IdempotencyService } from '../services/idempotency.service';

export interface DeliveryAssignedEvent {
  orderId: string;
  deliveryPersonId: string;
  estimatedMinutes: number;
  timestamp: string;
}

export interface PublishResult {
  success: boolean;
  eventId?: string;
  isDuplicate?: boolean;
  error?: string;
}

export class KafkaProducer {
  private readonly DELIVERY_ASSIGNED_TOPIC =
    process.env.KAFKA_TOPIC_DELIVERY_ASSIGNED || 'delivery.assigned';

  constructor(
    private producer: Producer,
    private idempotency?: IdempotencyService,
  ) {}

  async publishDeliveryAssigned(event: DeliveryAssignedEvent): Promise<PublishResult> {
    const eventId = uuidv4();

    if (this.idempotency) {
      const isRecorded = await this.idempotency.tryRecordEvent(eventId);
      if (!isRecorded) {
        return { success: false, eventId, isDuplicate: true };
      }
    }

    try {
      await this.producer.send({
        topic: this.DELIVERY_ASSIGNED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'delivery.assigned',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(
        `Published delivery.assigned event for order ${event.orderId} (eventId: ${eventId})`,
      );
      return { success: true, eventId };
    } catch (error) {
      logger.error('Failed to publish delivery.assigned event', error);
      return { success: false, eventId, error: String(error) };
    }
  }

  isConnected(): boolean {
    return this.producer != null;
  }
}
