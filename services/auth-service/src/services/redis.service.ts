import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

const LOGIN_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10);
const LOGIN_WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '900', 10);

let client: RedisClientType | null = null;

export function initializeRedis(redisClient: RedisClientType) {
  client = redisClient;
}

function getClient(): RedisClientType | null {
  return client;
}

export async function blacklistToken(token: string, expiresAt: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  const ttl = expiresAt - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;

  try {
    await redis.set(`blacklist:${token}`, '1', { EX: ttl });
  } catch (error) {
    logger.error('Failed to blacklist token', { error: (error as Error).message });
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = getClient();
  if (!redis) return false;

  try {
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    logger.error('Failed to check token blacklist', { error: (error as Error).message });
    return false;
  }
}

export async function checkLoginRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const redis = getClient();
  if (!redis) return { allowed: true, remaining: LOGIN_RATE_LIMIT };

  const key = `rate:login:${identifier}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, LOGIN_WINDOW_SECONDS);
    }

    if (count > LOGIN_RATE_LIMIT) {
      const ttl = await redis.ttl(key);
      return { allowed: false, remaining: 0, retryAfter: ttl };
    }

    return { allowed: true, remaining: LOGIN_RATE_LIMIT - count };
  } catch (error) {
    logger.error('Failed to check rate limit', { error: (error as Error).message });
    return { allowed: true, remaining: LOGIN_RATE_LIMIT };
  }
}

export async function resetLoginRateLimit(identifier: string): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  try {
    await redis.del(`rate:login:${identifier}`);
  } catch (error) {
    logger.error('Failed to reset rate limit', { error: (error as Error).message });
  }
}
