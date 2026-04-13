import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
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

export class NotificationKafkaConsumer {
  private consumer: Consumer;
  private connected = false;

  constructor(private readonly notificationService: NotificationService) {
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.consumer = kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
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

        let data: unknown;
        try {
          data = JSON.parse(message.value.toString());
        } catch (err) {
          logger.error('Failed to parse Kafka message', { topic, err });
          return;
        }

        try {
          await this.handleMessage(topic, data);
        } catch (err) {
          logger.error('Error handling Kafka message', { topic, err });
        }
      },
    });
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
    this.connected = false;
    logger.info('Kafka consumer disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }
}
