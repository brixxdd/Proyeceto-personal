import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  user: JwtPayload | null;
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Authentication failed');
  }
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: String(process.env.JWT_EXPIRES_IN || '1h'),
  } as SignOptions);
}

export function generateRefreshToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: String(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
  } as SignOptions);
}

export async function getAuthContext(authorization?: string): Promise<AuthContext> {
  if (!authorization) {
    return { user: null };
  }

  const token = authorization.replace('Bearer ', '');
  
  try {
    const user = verifyToken(token);
    return { user };
  } catch (error) {
    logger.warn('Invalid token', { error: (error as Error).message });
    return { user: null };
  }
}
