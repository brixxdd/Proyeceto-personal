import { NotificationService, NotificationPreferenceInput } from './services/notification.service';

interface RedisSubClientLike {
  subscribe(channel: string, listener: (message: string, channel: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
}

interface Context {
  notificationService: NotificationService;
  subClient: RedisSubClientLike;
}

// Minimal async iterator backed by Redis subscribe for a single userId channel
async function* createNotificationIterator(
  subClient: RedisSubClientLike,
  userId: string,
): AsyncGenerator<unknown> {
  const channel = `notification:${userId}`;
  const queue: unknown[] = [];
  let resolve: (() => void) | null = null;
  let done = false;

  await subClient.subscribe(channel, (message: string, _channel: string) => {
    try {
      const parsed = JSON.parse(message);
      queue.push(parsed);
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    } catch {
      // ignore parse errors
    }
  });

  try {
    while (!done) {
      if (queue.length > 0) {
        yield queue.shift();
      } else {
        await new Promise<void>((res) => {
          resolve = res;
        });
      }
    }
  } finally {
    done = true;
    await subClient.unsubscribe(channel);
  }
}

export const resolvers = {
  Query: {
    notifications: async (
      _: unknown,
      args: { userId: string; limit?: number; offset?: number },
      ctx: Context,
    ) => {
      return ctx.notificationService.getNotifications(args.userId, args.limit, args.offset);
    },

    notificationPreferences: async (
      _: unknown,
      args: { userId: string },
      ctx: Context,
    ) => {
      return ctx.notificationService.getPreferences(args.userId);
    },

    unreadCount: async (
      _: unknown,
      args: { userId: string },
      ctx: Context,
    ) => {
      return ctx.notificationService.getUnreadCount(args.userId);
    },
  },

  Mutation: {
    updateNotificationPreferences: async (
      _: unknown,
      args: { userId: string; input: NotificationPreferenceInput },
      ctx: Context,
    ) => {
      return ctx.notificationService.updatePreferences(args.userId, args.input);
    },

    markNotificationRead: async (
      _: unknown,
      args: { id: string },
      ctx: Context,
    ) => {
      return ctx.notificationService.markRead(args.id);
    },

    markAllRead: async (
      _: unknown,
      args: { userId: string },
      ctx: Context,
    ) => {
      return ctx.notificationService.markAllRead(args.userId);
    },
  },

  Subscription: {
    newNotification: {
      subscribe: async (
        _: unknown,
        args: { userId: string },
        ctx: Context,
      ) => {
        return createNotificationIterator(ctx.subClient, args.userId);
      },
      resolve: (payload: unknown) => payload,
    },
  },

  Notification: {
    __resolveReference: async (
      reference: { id: string },
      ctx: Context,
    ) => {
      return ctx.notificationService.getNotificationById(reference.id);
    },
  },

  DateTime: {
    // Scalar passthrough - resolved as ISO string from DB Date
    serialize: (value: unknown) => {
      if (value instanceof Date) return value.toISOString();
      return String(value);
    },
    parseValue: (value: unknown) => new Date(value as string),
    parseLiteral: (ast: { value: string }) => new Date(ast.value),
  },
};
