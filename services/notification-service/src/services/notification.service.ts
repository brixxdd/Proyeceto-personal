import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { notificationsSentTotal, notificationsPending } from '../metrics/prometheus';

export interface RedisPubClientLike {
  publish(channel: string, message: string): Promise<number>;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: string | null;
  createdAt: Date;
}

export interface NotificationPreference {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  updatedAt: Date;
}

export interface NotificationPreferenceInput {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export class NotificationService {
  constructor(
    private readonly db: Pool,
    private readonly pubClient: RedisPubClientLike,
  ) {}

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const id = uuidv4();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const result = await this.db.query<Notification>(
      `INSERT INTO notifications (id, user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id AS "userId", type, title, message, read, metadata, created_at AS "createdAt"`,
      [id, userId, type, title, message, metadataJson],
    );

    const notification = result.rows[0];

    // Track metric
    notificationsSentTotal.inc({ type });
    notificationsPending.inc();

    // Publish to Redis PubSub for GraphQL subscriptions
    const channel = `notification:${userId}`;
    try {
      await this.pubClient.publish(channel, JSON.stringify(notification));
    } catch (err) {
      logger.warn('Failed to publish notification to Redis PubSub', { err, channel });
    }

    logger.info('Notification created', { id, userId, type });
    return notification;
  }

  async getNotifications(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<Notification[]> {
    const result = await this.db.query<Notification>(
      `SELECT id, user_id AS "userId", type, title, message, read, metadata, created_at AS "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows;
  }

  async markRead(id: string): Promise<Notification> {
    const result = await this.db.query<Notification>(
      `UPDATE notifications
       SET read = true
       WHERE id = $1
       RETURNING id, user_id AS "userId", type, title, message, read, metadata, created_at AS "createdAt"`,
      [id],
    );

    if (result.rowCount === 0) {
      throw new Error(`Notification ${id} not found`);
    }

    notificationsPending.dec();
    return result.rows[0];
  }

  async markAllRead(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE notifications
       SET read = true
       WHERE user_id = $1 AND read = false`,
      [userId],
    );

    const count = result.rowCount ?? 0;
    if (count > 0) {
      notificationsPending.dec(count);
    }

    return true;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read = false`,
      [userId],
    );
    return parseInt(result.rows[0].count, 10);
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    const result = await this.db.query<NotificationPreference>(
      `SELECT user_id AS "userId", email_enabled AS "emailEnabled", sms_enabled AS "smsEnabled",
              push_enabled AS "pushEnabled", updated_at AS "updatedAt"
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId],
    );

    if (result.rowCount === 0) {
      // Insert default preferences
      const insert = await this.db.query<NotificationPreference>(
        `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         RETURNING user_id AS "userId", email_enabled AS "emailEnabled", sms_enabled AS "smsEnabled",
                   push_enabled AS "pushEnabled", updated_at AS "updatedAt"`,
        [userId],
      );
      return insert.rows[0];
    }

    return result.rows[0];
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    const result = await this.db.query<Notification>(
      `SELECT id, user_id AS "userId", type, title, message, read, metadata, created_at AS "createdAt"
       FROM notifications WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async updatePreferences(
    userId: string,
    input: NotificationPreferenceInput,
  ): Promise<NotificationPreference> {
    const result = await this.db.query<NotificationPreference>(
      `INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, push_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
         SET email_enabled = EXCLUDED.email_enabled,
             sms_enabled   = EXCLUDED.sms_enabled,
             push_enabled  = EXCLUDED.push_enabled,
             updated_at    = CURRENT_TIMESTAMP
       RETURNING user_id AS "userId", email_enabled AS "emailEnabled", sms_enabled AS "smsEnabled",
                 push_enabled AS "pushEnabled", updated_at AS "updatedAt"`,
      [userId, input.emailEnabled, input.smsEnabled, input.pushEnabled],
    );
    return result.rows[0];
  }
}
