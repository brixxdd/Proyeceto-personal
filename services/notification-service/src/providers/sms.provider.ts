import { logger } from '../utils/logger';

export async function sendSms(to: string, message: string): Promise<void> {
  logger.info('SMS sent', { to, message });
}
