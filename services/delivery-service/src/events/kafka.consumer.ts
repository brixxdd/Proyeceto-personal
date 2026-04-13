import { Consumer } from 'kafkajs';
import { DeliveryService } from '../services/delivery.service';
import { logger } from '../utils/logger';

interface OrderCreatedPayload {
  orderId: string;
  customerId?: string;
  restaurantId?: string;
  timestamp?: string;
}

interface OrderCancelledPayload {
  orderId: string;
  timestamp?: string;
}

export class KafkaConsumer {
  private readonly ORDER_CREATED_TOPIC =
    process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created';
  private readonly ORDER_CANCELLED_TOPIC =
    process.env.KAFKA_TOPIC_ORDER_CANCELLED || 'order.cancelled';

  constructor(
    private readonly consumer: Consumer,
    private readonly deliveryService: DeliveryService,
  ) {}

  async start(): Promise<void> {
    await this.consumer.subscribe({
      topics: [this.ORDER_CREATED_TOPIC, this.ORDER_CANCELLED_TOPIC],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;

        try {
          const payload: unknown = JSON.parse(message.value.toString());

          if (topic === this.ORDER_CREATED_TOPIC) {
            await this.handleOrderCreated(payload as OrderCreatedPayload);
          } else if (topic === this.ORDER_CANCELLED_TOPIC) {
            await this.handleOrderCancelled(payload as OrderCancelledPayload);
          }
        } catch (error) {
          logger.error(`Error processing message from topic ${topic}`, error);
          // Do not re-throw: let Kafka continue to the next message (graceful degradation)
        }
      },
    });

    logger.info(
      `Kafka consumer subscribed to [${this.ORDER_CREATED_TOPIC}, ${this.ORDER_CANCELLED_TOPIC}]`,
    );
  }

  private async handleOrderCreated(event: OrderCreatedPayload): Promise<void> {
    const { orderId } = event;
    logger.info(`Handling order.created event for order ${orderId}`);

    // assignDelivery already handles the "no driver available" case gracefully
    const delivery = await this.deliveryService.assignDelivery(orderId);
    if (!delivery) {
      logger.warn(`Could not assign delivery for order ${orderId} — no available drivers`);
    }
  }

  private async handleOrderCancelled(event: OrderCancelledPayload): Promise<void> {
    const { orderId } = event;
    logger.info(`Handling order.cancelled event for order ${orderId}`);
    await this.deliveryService.cancelDelivery(orderId);
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }
}
