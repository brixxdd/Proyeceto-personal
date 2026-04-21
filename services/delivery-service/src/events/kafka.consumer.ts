import { Consumer, Producer } from 'kafkajs';
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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`, { error });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export class KafkaConsumer {
  private readonly ORDER_CREATED_TOPIC =
    process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created';
  private readonly ORDER_CANCELLED_TOPIC =
    process.env.KAFKA_TOPIC_ORDER_CANCELLED || 'order.cancelled';
  private readonly ORDER_CREATED_DLQ = 'order.created.dlq';
  private readonly ORDER_CANCELLED_DLQ = 'order.cancelled.dlq';

  constructor(
    private readonly consumer: Consumer,
    private readonly deliveryService: DeliveryService,
    private readonly producer?: Producer,
  ) {}

  async start(): Promise<void> {
    await this.consumer.subscribe({
      topics: [this.ORDER_CREATED_TOPIC, this.ORDER_CANCELLED_TOPIC],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;

        const rawValue = message.value.toString();
        let payload: unknown;
        try {
          payload = JSON.parse(rawValue);
        } catch (error) {
          logger.error(`Failed to parse message from topic ${topic}`, error);
          return;
        }

        const dlqTopic = topic === this.ORDER_CREATED_TOPIC
          ? this.ORDER_CREATED_DLQ
          : this.ORDER_CANCELLED_DLQ;

        try {
          await retryWithBackoff(async () => {
            if (topic === this.ORDER_CREATED_TOPIC) {
              await this.handleOrderCreated(payload as OrderCreatedPayload);
            } else if (topic === this.ORDER_CANCELLED_TOPIC) {
              await this.handleOrderCancelled(payload as OrderCancelledPayload);
            }
          });
        } catch (error) {
          logger.error(`Max retries exceeded for topic ${topic}, sending to DLQ`, error);
          await this.sendToDlq(dlqTopic, rawValue, topic, error);
        }
      },
    });

    logger.info(
      `Kafka consumer subscribed to [${this.ORDER_CREATED_TOPIC}, ${this.ORDER_CANCELLED_TOPIC}]`,
    );
  }

  private async sendToDlq(
    dlqTopic: string,
    rawValue: string,
    originalTopic: string,
    error: unknown,
  ): Promise<void> {
    if (!this.producer) {
      logger.error('No producer available for DLQ, message lost', { dlqTopic, originalTopic });
      return;
    }
    try {
      await this.producer.send({
        topic: dlqTopic,
        messages: [{
          value: rawValue,
          headers: {
            originalTopic,
            errorMessage: String(error),
            failedAt: new Date().toISOString(),
          },
        }],
      });
      logger.info(`Message sent to DLQ ${dlqTopic}`);
    } catch (dlqError) {
      logger.error(`Failed to send message to DLQ ${dlqTopic}`, dlqError);
    }
  }

  private async handleOrderCreated(event: OrderCreatedPayload): Promise<void> {
    const { orderId } = event;
    logger.info(`Handling order.created event for order ${orderId}`);

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
