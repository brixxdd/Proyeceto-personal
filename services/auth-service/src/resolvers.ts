import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { AuthService } from './services/auth.service';
import { getAuthContext, AuthContext, verifyToken, generateToken, generateRefreshToken } from './middleware/auth';
import { logger } from './utils/logger';

let authService: AuthService;

export function initializeResolvers(pool: Pool) {
  authService = new AuthService(pool);
}

export const resolvers = {
  Query: {
    me: async (_parent: any, _args: any, context: { auth: AuthContext }) => {
      if (!context.auth.user) {
        throw new Error('Not authenticated');
      }

      const user = await authService.getUserById(context.auth.user.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    },
  },
  Mutation: {
    register: async (_parent: any, args: any) => {
      logger.info('Register mutation called', { email: args.email });
      
      try {
        const result = await authService.createUser({
          email: args.email,
          password: args.password,
          name: args.name,
          phone: args.phone,
          role: args.role,
        });

        return result;
      } catch (error) {
        logger.error('Register failed', { error: (error as Error).message });
        throw error;
      }
    },
    login: async (_parent: any, args: any) => {
      logger.info('Login mutation called', { email: args.email });
      
      try {
        const result = await authService.login({
          email: args.email,
          password: args.password,
        });

        return result;
      } catch (error) {
        logger.error('Login failed', { error: (error as Error).message });
        throw error;
      }
    },
    refreshToken: async (_parent: any, args: any) => {
      logger.info('Refresh token mutation called');
      
      try {
        const decoded = verifyToken(args.refreshToken);
        
        // Get user from DB
        const user = await authService.getUserById(decoded.userId);
        
        if (!user) {
          throw new Error('User not found');
        }

        // Generate new tokens
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

        return { token, refreshToken };
      } catch (error) {
        logger.error('Refresh token failed', { error: (error as Error).message });
        throw new Error('Invalid refresh token');
      }
    },
  },
};
