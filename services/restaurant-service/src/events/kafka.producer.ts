import { Kafka, Producer, Partitioners } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RestaurantCreatedEvent {
  restaurantId: string;
  name: string;
  ownerId: string;
  cuisineType: string;
  timestamp: string;
}

export interface MenuUpdatedEvent {
  restaurantId: string;
  action: 'created' | 'updated' | 'deleted';
  menuItemId: string;
  timestamp: string;
}

export class RestaurantKafkaProducer {
  private producer: Producer;
  private connected = false;

  private readonly RESTAURANT_CREATED_TOPIC = process.env.KAFKA_TOPIC_RESTAURANT_CREATED || 'restaurant.created';
  private readonly MENU_UPDATED_TOPIC = process.env.KAFKA_TOPIC_MENU_UPDATED || 'menu.updated';

  constructor() {
    const kafka = new Kafka({
      clientId: 'restaurant-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      logger.info('Kafka producer connected');
    } catch (error) {
      logger.warn('Failed to connect Kafka producer, events will be skipped', {
        error: (error as Error).message,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  async publishRestaurantCreated(event: RestaurantCreatedEvent): Promise<void> {
    if (!this.connected) return;

    const eventId = uuidv4();
    try {
      await this.producer.send({
        topic: this.RESTAURANT_CREATED_TOPIC,
        messages: [
          {
            key: event.restaurantId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'restaurant.created',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info('Published restaurant.created event', { restaurantId: event.restaurantId, eventId });
    } catch (error) {
      logger.error('Failed to publish restaurant.created event', { error: (error as Error).message });
    }
  }

  async publishMenuUpdated(event: MenuUpdatedEvent): Promise<void> {
    if (!this.connected) return;

    const eventId = uuidv4();
    try {
      await this.producer.send({
        topic: this.MENU_UPDATED_TOPIC,
        messages: [
          {
            key: event.restaurantId,
            value: JSON.stringify(event),
            headers: {
              eventId,
              eventType: 'menu.updated',
              timestamp: event.timestamp,
            },
          },
        ],
      });
      logger.info('Published menu.updated event', { restaurantId: event.restaurantId, action: event.action, eventId });
    } catch (error) {
      logger.error('Failed to publish menu.updated event', { error: (error as Error).message });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
