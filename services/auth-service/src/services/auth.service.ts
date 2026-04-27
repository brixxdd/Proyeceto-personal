import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { generateToken, generateRefreshToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;

const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3003/graphql';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DELIVERY_PERSON' | 'ADMIN';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  token: string;
  refreshToken: string;
  user: User;
}

export class AuthService {
  constructor(private pool: Pool) {}

  async createUser(input: CreateUserInput): Promise<AuthPayload> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      // Insert user
      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, phone, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, phone, role, created_at, updated_at`,
        [input.email, passwordHash, input.name, input.phone || null, input.role]
      );

      const user = result.rows[0];

      // Generate tokens
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await client.query('COMMIT');

      logger.info('User created successfully', { userId: user.id, email: user.email });

      if (input.role === 'DELIVERY_PERSON') {
        await this.createDeliveryPersonProfile(user.id, user.name);
      }

      return {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at.toISOString(),
          updatedAt: user.updated_at.toISOString(),
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating user', { error: (error as Error).message });
      throw error;
    } finally {
      client.release();
    }
  }

  async login(input: LoginInput): Promise<AuthPayload> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [input.email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
      },
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, email, name, phone, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    };
  }

  private async createDeliveryPersonProfile(userId: string, name: string): Promise<void> {
    try {
      const response = await fetch(DELIVERY_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateDeliveryPerson($userId: ID!, $name: String!, $vehicleType: VehicleType!) {
              createDeliveryPerson(userId: $userId, name: $name, vehicleType: $vehicleType) {
                id
              }
            }
          `,
          variables: {
            userId,
            name,
            vehicleType: 'MOTORCYCLE',
          },
        }),
      });

      if (!response.ok) {
        logger.error('Failed to create delivery person profile', { userId, status: response.status });
      } else {
        logger.info('Delivery person profile created', { userId });
      }
    } catch (error) {
      logger.error('Error creating delivery person profile', { userId, error: String(error) });
    }
  }
}
