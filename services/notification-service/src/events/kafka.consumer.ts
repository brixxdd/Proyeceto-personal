import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notification.service';
import { sendEmail } from '../providers/email.provider';
import { sendSms } from '../providers/sms.provider';

interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  restaurantId: string;
  timestamp: string;
}

interface OrderAssignedPayload {
  orderId: string;
  customerId: string;
  deliveryPersonId: string;
  timestamp: string;
}

interface OrderDeliveredPayload {
  orderId: string;
  customerId: string;
  timestamp: string;
}

interface OrderCancelledPayload {
  orderId: string;
  customerId: string;
  timestamp: string;
}

interface DeliveryAssignedPayload {
  orderId: string;
  deliveryPersonId: string;
  timestamp: string;
}

const DLQ_MAP: Record<string, string> = {
  'order.created': 'order.created.dlq',
  'order.assigned': 'order.assigned.dlq',
  'order.cancelled': 'order.cancelled.dlq',
  'delivery.assigned': 'delivery.assigned.dlq',
};

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

export class NotificationKafkaConsumer {
  private consumer: Consumer;
  private producer: Producer;
  private connected = false;

  constructor(private readonly notificationService: NotificationService) {
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.consumer = kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
    });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.producer.connect();
    this.connected = true;
    logger.info('Kafka consumer connected');
  }

  async subscribe(): Promise<void> {
    const topics = [
      process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created',
      process.env.KAFKA_TOPIC_ORDER_ASSIGNED || 'order.assigned',
      process.env.KAFKA_TOPIC_ORDER_DELIVERED || 'order.delivered',
      process.env.KAFKA_TOPIC_ORDER_CANCELLED || 'order.cancelled',
      process.env.KAFKA_TOPIC_DELIVERY_ASSIGNED || 'delivery.assigned',
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    logger.info('Kafka consumer subscribed to topics', { topics });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;

        if (!message.value) return;

        const rawValue = message.value.toString();
        let data: unknown;
        try {
          data = JSON.parse(rawValue);
        } catch (err) {
          logger.error('Failed to parse Kafka message', { topic, err });
          return;
        }

        try {
          await retryWithBackoff(() => this.handleMessage(topic, data));
        } catch (err) {
          logger.error('Max retries exceeded for topic, sending to DLQ', { topic, err });
          await this.sendToDlq(topic, rawValue, err);
        }
      },
    });
  }

  private async sendToDlq(originalTopic: string, rawValue: string, error: unknown): Promise<void> {
    const dlqTopic = DLQ_MAP[originalTopic] ?? `${originalTopic}.dlq`;
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

  private async handleMessage(topic: string, data: unknown): Promise<void> {
    const orderCreatedTopic = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created';
    const orderAssignedTopic = process.env.KAFKA_TOPIC_ORDER_ASSIGNED || 'order.assigned';
    const orderDeliveredTopic = process.env.KAFKA_TOPIC_ORDER_DELIVERED || 'order.delivered';
    const orderCancelledTopic = process.env.KAFKA_TOPIC_ORDER_CANCELLED || 'order.cancelled';
    const deliveryAssignedTopic = process.env.KAFKA_TOPIC_DELIVERY_ASSIGNED || 'delivery.assigned';

    if (topic === orderCreatedTopic) {
      await this.handleOrderCreated(data as OrderCreatedPayload);
    } else if (topic === orderAssignedTopic) {
      await this.handleOrderAssigned(data as OrderAssignedPayload);
    } else if (topic === orderDeliveredTopic) {
      await this.handleOrderDelivered(data as OrderDeliveredPayload);
    } else if (topic === orderCancelledTopic) {
      await this.handleOrderCancelled(data as OrderCancelledPayload);
    } else if (topic === deliveryAssignedTopic) {
      await this.handleDeliveryAssigned(data as DeliveryAssignedPayload);
    } else {
      logger.warn('Received message for unhandled topic', { topic });
    }
  }

  private async handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    const { orderId, customerId } = payload;
    const title = 'Pedido recibido';
    const message = `Tu pedido #${orderId} fue recibido`;

    await this.notificationService.createNotification(
      customerId,
      'ORDER_CREATED',
      title,
      message,
      { orderId },
    );

    logger.info('Email sent to customer for order.created', { customerId, orderId });
    await sendEmail(customerId, title, message);
    await sendSms(customerId, message);
  }

  private async handleOrderAssigned(payload: OrderAssignedPayload): Promise<void> {
    const { orderId, customerId } = payload;
    const title = 'Pedido en camino';
    const message = 'Tu pedido está en camino';

    await this.notificationService.createNotification(
      customerId,
      'ORDER_ASSIGNED',
      title,
      message,
      { orderId },
    );

    logger.info('Email sent to customer for order.assigned', { customerId, orderId });
    await sendEmail(customerId, title, message);
    await sendSms(customerId, message);
  }

  private async handleOrderDelivered(payload: OrderDeliveredPayload): Promise<void> {
    const { orderId, customerId } = payload;
    const title = 'Pedido entregado';
    const message = 'Tu pedido fue entregado. ¡Buen provecho!';

    await this.notificationService.createNotification(
      customerId,
      'ORDER_DELIVERED',
      title,
      message,
      { orderId },
    );

    logger.info('Email sent to customer for order.delivered', { customerId, orderId });
    await sendEmail(customerId, title, message);
    await sendSms(customerId, message);
  }

  private async handleOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
    const { orderId, customerId } = payload;
    const title = 'Pedido cancelado';
    const message = `Tu pedido #${orderId} fue cancelado`;

    await this.notificationService.createNotification(
      customerId,
      'ORDER_CANCELLED',
      title,
      message,
      { orderId },
    );

    logger.info('Email sent to customer for order.cancelled', { customerId, orderId });
    await sendEmail(customerId, title, message);
    await sendSms(customerId, message);
  }

  private async handleDeliveryAssigned(payload: DeliveryAssignedPayload): Promise<void> {
    const { orderId, deliveryPersonId } = payload;
    const title = 'Nuevo pedido asignado';
    const message = `Tienes un nuevo pedido asignado #${orderId}`;

    await this.notificationService.createNotification(
      deliveryPersonId,
      'DELIVERY_ASSIGNED',
      title,
      message,
      { orderId },
    );

    logger.info('Email sent to delivery person for delivery.assigned', { deliveryPersonId, orderId });
    await sendEmail(deliveryPersonId, title, message);
    await sendSms(deliveryPersonId, message);
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.producer.disconnect();
    this.connected = false;
    logger.info('Kafka consumer disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }
}
