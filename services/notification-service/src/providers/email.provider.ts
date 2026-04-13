import { logger } from '../utils/logger';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  logger.info('Email sent', { to, subject, body });
}
