import { EventEmitter } from 'events';
import { PubSubEngine } from 'graphql-subscriptions';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

/**
 * Redis-backed PubSub engine using redis v4.
 *
 * Uses two separate clients:
 *   - publisher  — sends PUBLISH commands
 *   - subscriber — holds persistent SUBSCRIBE connections
 *
 * The subscriber client fans out incoming messages to local EventEmitter
 * listeners so multiple concurrent GraphQL subscribers on the same channel
 * all receive their events without duplicating Redis subscriptions.
 */
export class RedisPubSub extends PubSubEngine {
  private readonly emitter = new EventEmitter();
  /** channel → number of active GraphQL subscriptions */
  private readonly channelCount = new Map<string, number>();
  /** subscriptionId → { channel, listener } */
  private readonly subscriptions = new Map<
    number,
    { channel: string; listener: (...args: unknown[]) => void }
  >();
  private subIdCounter = 0;

  constructor(
    private readonly publisher: RedisClient,
    private readonly subscriber: RedisClient,
  ) {
    super();
    this.emitter.setMaxListeners(0);
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  async subscribe(
    channel: string,
    onMessage: (...args: unknown[]) => void,
  ): Promise<number> {
    const id = ++this.subIdCounter;
    this.subscriptions.set(id, { channel, listener: onMessage });
    this.emitter.on(channel, onMessage);

    const count = this.channelCount.get(channel) ?? 0;
    if (count === 0) {
      await this.subscriber.subscribe(channel, (message: string) => {
        try {
          this.emitter.emit(channel, JSON.parse(message));
        } catch (err) {
          logger.error(`RedisPubSub: failed to parse message on ${channel}`, err);
        }
      });
      logger.debug(`RedisPubSub: subscribed to Redis channel "${channel}"`);
    }
    this.channelCount.set(channel, count + 1);
    return id;
  }

  async unsubscribe(id: number): Promise<void> {
    const sub = this.subscriptions.get(id);
    if (!sub) return;

    this.emitter.removeListener(sub.channel, sub.listener);
    this.subscriptions.delete(id);

    const count = (this.channelCount.get(sub.channel) ?? 1) - 1;
    if (count <= 0) {
      this.channelCount.delete(sub.channel);
      await this.subscriber.unsubscribe(sub.channel);
      logger.debug(`RedisPubSub: unsubscribed from Redis channel "${sub.channel}"`);
    } else {
      this.channelCount.set(sub.channel, count);
    }
  }
}

/** Channel name for delivery status updates */
export const deliveryStatusChannel = (deliveryId: string) => `delivery:status:${deliveryId}`;

/** Channel name for driver assignment events */
export const driverAssignedChannel = (orderId: string) => `delivery:driver-assigned:${orderId}`;

/** Channel for a delivery person's assigned deliveries updates */
export const myDeliveryUpdatesChannel = (deliveryPersonId: string) => `delivery:my-updates:${deliveryPersonId}`;
