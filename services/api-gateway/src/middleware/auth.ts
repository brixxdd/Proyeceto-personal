import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
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

export function getContextFromRequest(authorization?: string): Record<string, any> {
  if (!authorization) {
    return { user: null };
  }

  const token = authorization.replace('Bearer ', '');

  try {
    const user = verifyToken(token);
    return { user };
  } catch (error) {
    return { user: null, authError: (error as Error).message };
  }
}
