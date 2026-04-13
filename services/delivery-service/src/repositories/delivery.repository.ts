import { Pool } from 'pg';
import {
  Delivery,
  DeliveryPerson,
  DeliveryRow,
  DeliveryPersonRow,
  DeliveryStatus,
  DriverStatus,
  Location,
  mapDelivery,
  mapDeliveryPerson,
} from '../models/delivery.model';

export class DeliveryRepository {
  constructor(private readonly pool: Pool) {}

  // ── DeliveryPerson ────────────────────────────────────────────────────────

  async findDeliveryPersonById(id: string): Promise<DeliveryPerson | null> {
    const result = await this.pool.query<DeliveryPersonRow>(
      'SELECT * FROM delivery_people WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return mapDeliveryPerson(result.rows[0]);
  }

  async findAvailableDriver(): Promise<DeliveryPerson | null> {
    // Pick a random AVAILABLE driver — ORDER BY RANDOM() is fine for city-scale tables.
    const result = await this.pool.query<DeliveryPersonRow>(
      "SELECT * FROM delivery_people WHERE status = 'AVAILABLE' ORDER BY RANDOM() LIMIT 1",
    );
    if (result.rows.length === 0) return null;
    return mapDeliveryPerson(result.rows[0]);
  }

  async findAvailableDrivers(): Promise<DeliveryPerson[]> {
    const result = await this.pool.query<DeliveryPersonRow>(
      "SELECT * FROM delivery_people WHERE status = 'AVAILABLE' ORDER BY rating DESC",
    );
    return result.rows.map(mapDeliveryPerson);
  }

  async updateDriverStatus(
    id: string,
    status: DriverStatus,
    location?: Location,
  ): Promise<DeliveryPerson | null> {
    const result = await this.pool.query<DeliveryPersonRow>(
      `UPDATE delivery_people
       SET status = $2,
           current_location = COALESCE($3::jsonb, current_location),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, location ? JSON.stringify(location) : null],
    );
    if (result.rows.length === 0) return null;
    return mapDeliveryPerson(result.rows[0]);
  }

  // ── Delivery ──────────────────────────────────────────────────────────────

  async findDeliveryById(id: string): Promise<Delivery | null> {
    const result = await this.pool.query<DeliveryRow>(
      'SELECT * FROM deliveries WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return mapDelivery(result.rows[0]);
  }

  async findDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
    const result = await this.pool.query<DeliveryRow>(
      'SELECT * FROM deliveries WHERE order_id = $1',
      [orderId],
    );
    if (result.rows.length === 0) return null;
    return mapDelivery(result.rows[0]);
  }

  async findDeliveries(filters: {
    orderId?: string;
    status?: DeliveryStatus;
  }): Promise<Delivery[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.orderId) {
      conditions.push(`order_id = $${idx++}`);
      values.push(filters.orderId);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query<DeliveryRow>(
      `SELECT * FROM deliveries ${where} ORDER BY created_at DESC`,
      values,
    );
    return result.rows.map(mapDelivery);
  }

  async createDelivery(data: {
    orderId: string;
    deliveryPersonId: string;
    status: DeliveryStatus;
  }): Promise<Delivery> {
    const result = await this.pool.query<DeliveryRow>(
      `INSERT INTO deliveries (order_id, delivery_person_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.orderId, data.deliveryPersonId, data.status],
    );
    return mapDelivery(result.rows[0]);
  }

  async updateDeliveryStatus(id: string, status: DeliveryStatus): Promise<Delivery | null> {
    let extraSet = '';
    if (status === 'PICKED_UP') {
      extraSet = ', pickup_time = NOW()';
    } else if (status === 'DELIVERED') {
      extraSet = ', delivery_time = NOW()';
    }

    const result = await this.pool.query<DeliveryRow>(
      `UPDATE deliveries
       SET status = $2${extraSet}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    if (result.rows.length === 0) return null;
    return mapDelivery(result.rows[0]);
  }

  async countActiveDeliveries(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM deliveries WHERE status NOT IN ('DELIVERED', 'CANCELLED')",
    );
    return parseInt(result.rows[0].count, 10);
  }

  async countAvailableDrivers(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM delivery_people WHERE status = 'AVAILABLE'",
    );
    return parseInt(result.rows[0].count, 10);
  }
}
