import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  isAuthenticated: boolean;
  user?: JwtPayload;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET no está configurado en las variables de entorno');
      return null;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token JWT expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Token JWT inválido', error);
    } else {
      logger.error('Error al verificar token JWT', error);
    }
    return null;
  }
}

export function extractAuthContext(authHeader: string | undefined): AuthContext {
  if (!authHeader) {
    return { isAuthenticated: false };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('Formato de Authorization header inválido');
    return { isAuthenticated: false };
  }

  const token = parts[1];
  const user = verifyToken(token);

  if (!user) {
    return { isAuthenticated: false };
  }

  logger.debug('Token JWT válido', { userId: user.userId, role: user.role });

  return {
    isAuthenticated: true,
    user,
  };
}

export function requireAuth(authContext: AuthContext): JwtPayload {
  if (!authContext.isAuthenticated || !authContext.user) {
    throw new Error('Unauthorized');
  }
  return authContext.user;
}
