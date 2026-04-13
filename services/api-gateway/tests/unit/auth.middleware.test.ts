import jwt from 'jsonwebtoken';
import { verifyToken, getContextFromRequest, JwtPayload } from '../../src/middleware/auth';

jest.mock('jsonwebtoken');

describe('API Gateway - Auth Middleware', () => {
  const mockPayload: JwtPayload = {
    userId: 'user-uuid-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify a valid token successfully', () => {
      // Arrange
      const mockDecoded = { ...mockPayload, iat: 1234567890, exp: 1234571490 };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      // Act
      const result = verifyToken('valid-token');

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(result).toEqual(mockDecoded);
      expect(result.userId).toBe('user-uuid-123');
    });

    it('should throw "Token expired" when token is expired', () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      // Act & Assert
      expect(() => verifyToken('expired-token')).toThrow('Token expired');
    });

    it('should throw "Invalid token" when token is malformed', () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Act & Assert
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw "Authentication failed" for unknown errors', () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown error');
      });

      // Act & Assert
      expect(() => verifyToken('bad-token')).toThrow('Authentication failed');
    });
  });

  describe('getContextFromRequest', () => {
    it('should return user null when no authorization header', () => {
      // Act
      const result = getContextFromRequest();

      // Assert
      expect(result).toEqual({ user: null });
    });

    it('should return user null when authorization header is empty', () => {
      // Act
      const result = getContextFromRequest('');

      // Assert
      expect(result).toEqual({ user: null });
    });

    it('should extract and verify token from Bearer header', () => {
      // Arrange
      const mockDecoded = { ...mockPayload };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      // Act
      const result = getContextFromRequest('Bearer valid-token');

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(result.user).toEqual(mockDecoded);
      expect(result.authError).toBeUndefined();
    });

    it('should return user null and authError when token is invalid', () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid');
      });

      // Act
      const result = getContextFromRequest('Bearer invalid-token');

      // Assert
      expect(result.user).toBeNull();
      expect(result.authError).toBe('Invalid token');
    });

    it('should return user null and authError when token is expired', () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('expired', new Date());
      });

      // Act
      const result = getContextFromRequest('Bearer expired-token');

      // Assert
      expect(result.user).toBeNull();
      expect(result.authError).toBe('Token expired');
    });

    it('should handle non-Bearer authorization header', () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid');
      });

      // Act
      const result = getContextFromRequest('Basic some-token');

      // Assert
      expect(result.user).toBeNull();
      expect(result.authError).toBeDefined();
    });
  });
});
