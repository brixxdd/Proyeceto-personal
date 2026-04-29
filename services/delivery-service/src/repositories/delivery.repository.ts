import { Pool } from 'pg';
import {
  Delivery,
  DeliveryPerson,
  DeliveryRow,
  DeliveryPersonRow,
  DeliveryStatus,
  DriverStatus,
  Location,
  VehicleType,
  mapDelivery,
  mapDeliveryPerson,
} from '../models/delivery.model';

export class DeliveryRepository {
  constructor(private readonly pool: Pool) { }

  // ── DeliveryPerson ────────────────────────────────────────────────────────

  async findDeliveryPersonById(id: string): Promise<DeliveryPerson | null> {
    const result = await this.pool.query<DeliveryPersonRow>(
      'SELECT * FROM delivery_people WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return mapDeliveryPerson(result.rows[0]);
  }

  async findDeliveryPersonByUserId(userId: string): Promise<DeliveryPerson | null> {
    const result = await this.pool.query<DeliveryPersonRow>(
      `SELECT dp.* FROM delivery_people dp
       WHERE dp.user_id = $1
       ORDER BY dp.created_at DESC
       LIMIT 1`,
      [userId],
    );
    if (result.rows.length === 0) return null;
    return mapDeliveryPerson(result.rows[0]);
  }

  async findAvailableDriver(): Promise<DeliveryPerson | null> {
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

  async findAvailableDeliveries(): Promise<Delivery[]> {
    const result = await this.pool.query<DeliveryRow>(
      `SELECT d.* FROM deliveries d
       WHERE d.status = 'PENDING' AND d.delivery_person_id IS NULL
       ORDER BY d.created_at ASC`,
    );
    return result.rows.map(mapDelivery);
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
    deliveryPersonId?: string;
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
    if (filters.deliveryPersonId) {
      conditions.push(`delivery_person_id = $${idx++}`);
      values.push(filters.deliveryPersonId);
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

  async createPendingDelivery(orderId: string): Promise<Delivery> {
    const result = await this.pool.query<DeliveryRow>(
      `INSERT INTO deliveries (order_id, delivery_person_id, status)
       VALUES ($1, NULL, 'PENDING')
       ON CONFLICT (order_id) DO NOTHING
       RETURNING *`,
      [orderId],
    );
    if (result.rows.length === 0) {
      // Already exists, try to find it
      const existing = await this.findDeliveryByOrderId(orderId);
      if (!existing) throw new Error(`Could not create or find delivery for order ${orderId}`);
      return existing;
    }
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

  async createDeliveryPerson(data: {
    userId: string;
    name: string;
    vehicleType: VehicleType;
  }): Promise<DeliveryPerson> {
    const result = await this.pool.query<DeliveryPersonRow>(
      `INSERT INTO delivery_people (user_id, name, vehicle_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.userId, data.name, data.vehicleType],
    );
    return mapDeliveryPerson(result.rows[0]);
  }

  async updateDelivery(data: {
    id: string;
    deliveryPersonId: string;
    status: DeliveryStatus;
  }): Promise<Delivery | null> {
    const result = await this.pool.query<DeliveryRow>(
      `UPDATE deliveries
       SET delivery_person_id = $2, status = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [data.id, data.deliveryPersonId, data.status],
    );
    if (result.rows.length === 0) return null;
    return mapDelivery(result.rows[0]);
  }

  /**
   * Atomically claim a PENDING delivery for a driver using row-level locking.
   * Returns the delivery if successfully claimed, null if already taken.
   */
  async claimDelivery(deliveryId: string, deliveryPersonId: string): Promise<Delivery | null> {
    const result = await this.pool.query<DeliveryRow>(
      `UPDATE deliveries
       SET delivery_person_id = $2, status = 'ASSIGNED', updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING' AND delivery_person_id IS NULL
       RETURNING *`,
      [deliveryId, deliveryPersonId],
    );
    if (result.rows.length === 0) return null;
    return mapDelivery(result.rows[0]);
  }
}

