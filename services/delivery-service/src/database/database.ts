import { Pool } from 'pg';
import { join } from 'path';
import runner from 'node-pg-migrate';
import { logger } from '../utils/logger';

export class Database {
  static async runMigrations(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
      await runner({
        dbClient: client,
        migrationsTable: 'pgmigrations',
        dir: join(__dirname, '../../migrations'),
        direction: 'up',
        log: (msg: string) => logger.info(msg),
      });
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Database migration failed', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
