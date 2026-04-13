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

/**
 * Valida y decodifica un JWT token
 * @param token - JWT token string
 * @returns JwtPayload decodificado o null si es inválido
 */
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

/**
 * Extrae y valida el token JWT del header Authorization
 * @param authHeader - Header Authorization completo
 * @returns AuthContext con información del usuario o no autenticado
 */
export function extractAuthContext(authHeader: string | undefined): AuthContext {
  if (!authHeader) {
    return { isAuthenticated: false };
  }

  // Extraer token del formato "Bearer <token>"
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

/**
 * Middleware para proteger resolvers que requieren autenticación
 * Lanza un error si el usuario no está autenticado
 * @param authContext - Contexto de autenticación
 * @returns JwtPayload del usuario autenticado
 * @throws Error si no está autenticado
 */
export function requireAuth(authContext: AuthContext): JwtPayload {
  if (!authContext.isAuthenticated || !authContext.user) {
    throw new Error('Unauthorized');
  }
  return authContext.user;
}
