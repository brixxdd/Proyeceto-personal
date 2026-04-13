import jwt from 'jsonwebtoken';
import {
  verifyToken,
  generateToken,
  generateRefreshToken,
  getAuthContext,
} from '../../src/middleware/auth';

jest.mock('jsonwebtoken');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  const mockPayload = {
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
      expect(result.email).toBe('test@example.com');
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

  describe('generateToken', () => {
    it('should generate a token with correct payload and expiry', () => {
      // Arrange
      (jwt.sign as jest.Mock).mockReturnValue('generated-token');

      // Act
      const result = generateToken(mockPayload);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: '1h',
        })
      );
      expect(result).toBe('generated-token');
    });

    it('should use custom JWT_EXPIRES_IN from environment', () => {
      // Arrange
      const originalValue = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '30m';
      (jwt.sign as jest.Mock).mockReturnValue('token');

      // Act
      generateToken(mockPayload);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: '30m',
        })
      );

      // Cleanup
      process.env.JWT_EXPIRES_IN = originalValue;
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with correct payload and expiry', () => {
      // Arrange
      (jwt.sign as jest.Mock).mockReturnValue('refresh-token');

      // Act
      const result = generateRefreshToken(mockPayload);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        process.env.JWT_REFRESH_SECRET,
        expect.objectContaining({
          expiresIn: '7d',
        })
      );
      expect(result).toBe('refresh-token');
    });

    it('should use custom JWT_REFRESH_EXPIRES_IN from environment', () => {
      // Arrange
      const originalValue = process.env.JWT_REFRESH_EXPIRES_IN;
      process.env.JWT_REFRESH_EXPIRES_IN = '14d';
      (jwt.sign as jest.Mock).mockReturnValue('token');

      // Act
      generateRefreshToken(mockPayload);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        process.env.JWT_REFRESH_SECRET,
        expect.objectContaining({
          expiresIn: '14d',
        })
      );

      // Cleanup
      process.env.JWT_REFRESH_EXPIRES_IN = originalValue;
    });
  });

  describe('getAuthContext', () => {
    it('should return user null when no authorization header', async () => {
      // Act
      const result = await getAuthContext();

      // Assert
      expect(result).toEqual({ user: null });
    });

    it('should return user null when authorization header is empty', async () => {
      // Act
      const result = await getAuthContext('');

      // Assert
      expect(result).toEqual({ user: null });
    });

    it('should extract and verify token from Bearer header', async () => {
      // Arrange
      const mockDecoded = { ...mockPayload };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      // Act
      const result = await getAuthContext('Bearer valid-token');

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(result.user).toEqual(mockDecoded);
    });

    it('should return user null when token is invalid', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid');
      });

      // Act
      const result = await getAuthContext('Bearer invalid-token');

      // Assert
      expect(result.user).toBeNull();
    });

    it('should return user null when token is expired', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('expired', new Date());
      });

      // Act
      const result = await getAuthContext('Bearer expired-token');

      // Assert
      expect(result.user).toBeNull();
    });

    it('should handle non-Bearer authorization header', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid');
      });

      // Act
      const result = await getAuthContext('Basic some-token');

      // Assert
      expect(result.user).toBeNull();
    });
  });
});
