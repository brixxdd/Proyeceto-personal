import { Producer } from 'kafkajs';
import { logger } from '../utils/logger';

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

export class KafkaProducer {
  private readonly ORDER_CREATED_TOPIC = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created';
  private readonly ORDER_ASSIGNED_TOPIC = process.env.KAFKA_TOPIC_ORDER_ASSIGNED || 'order.assigned';
  private readonly ORDER_DELIVERED_TOPIC = process.env.KAFKA_TOPIC_ORDER_DELIVERED || 'order.delivered';

  constructor(private producer: Producer) {}

  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: this.ORDER_CREATED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventType: 'order.created',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.created event for order ${event.orderId}`);
    } catch (error) {
      logger.error('Failed to publish order.created event', error);
      throw error;
    }
  }

  async publishOrderAssigned(event: OrderAssignedEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: this.ORDER_ASSIGNED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventType: 'order.assigned',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.assigned event for order ${event.orderId}`);
    } catch (error) {
      logger.error('Failed to publish order.assigned event', error);
      throw error;
    }
  }

  async publishOrderDelivered(event: OrderDeliveredEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: this.ORDER_DELIVERED_TOPIC,
        messages: [
          {
            key: event.orderId,
            value: JSON.stringify(event),
            headers: {
              eventType: 'order.delivered',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info(`Published order.delivered event for order ${event.orderId}`);
    } catch (error) {
      logger.error('Failed to publish order.delivered event', error);
      throw error;
    }
  }
}

