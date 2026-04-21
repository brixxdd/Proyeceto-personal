import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { resolvers, initializeResolvers } from '../../src/resolvers';
import { AuthService } from '../../src/services/auth.service';

// Mock de dependencias
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('../../src/services/auth.service', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => ({
      createUser: jest.fn(),
      login: jest.fn(),
      getUserById: jest.fn(),
    })),
  };
});

jest.mock('jsonwebtoken');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GraphQL Resolvers', () => {
  let mockPool: any;
  let mockAuthService: any;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    role: 'CUSTOMER',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAuthPayload = {
    token: 'jwt-token-here',
    refreshToken: 'refresh-token-here',
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = new Pool();
    initializeResolvers(mockPool);

    mockAuthService = (AuthService as jest.Mock).mock.results[0].value;
  });

  describe('Mutation: register', () => {
    const registerArgs = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
      phone: '+0987654321',
      role: 'CUSTOMER',
    };

    it('should call authService.createUser and return auth payload', async () => {
      // Arrange
      mockAuthService.createUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await resolvers.Mutation.register(null, registerArgs);

      // Assert
      expect(mockAuthService.createUser).toHaveBeenCalledWith({
        email: registerArgs.email,
        password: registerArgs.password,
        name: registerArgs.name,
        phone: registerArgs.phone,
        role: registerArgs.role,
      });
      expect(result).toEqual(mockAuthPayload);
    });

    it('should throw error when authService.createUser fails', async () => {
      // Arrange
      const error = new Error('Email already registered');
      mockAuthService.createUser.mockRejectedValue(error);

      // Act & Assert
      await expect(
        resolvers.Mutation.register(null, registerArgs)
      ).rejects.toThrow('Email already registered');
    });

    it('should handle registration without phone', async () => {
      // Arrange
      mockAuthService.createUser.mockResolvedValue(mockAuthPayload);
      const argsWithoutPhone = { ...registerArgs, phone: undefined };

      // Act
      await resolvers.Mutation.register(null, argsWithoutPhone);

      // Assert
      expect(mockAuthService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: undefined,
        })
      );
    });
  });

  describe('Mutation: login', () => {
    const loginArgs = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should call authService.login and return auth payload', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await resolvers.Mutation.login(null, loginArgs, {});

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: loginArgs.email,
        password: loginArgs.password,
      });
      expect(result).toEqual(mockAuthPayload);
    });

    it('should throw error when credentials are invalid', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(
        resolvers.Mutation.login(null, loginArgs, {})
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Mutation: refreshToken', () => {
    const refreshArgs = {
      refreshToken: 'old-refresh-token',
    };

    it('should generate new tokens with valid refresh token', async () => {
      // Arrange
      const decodedPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockAuthService.getUserById.mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue('new-token');

      // Act
      const result = await resolvers.Mutation.refreshToken(null, refreshArgs);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(
        refreshArgs.refreshToken,
        process.env.JWT_SECRET
      );
      expect(mockAuthService.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(jwt.sign).toHaveBeenCalledTimes(2); // token + refresh token
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error when refresh token is invalid', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(
        resolvers.Mutation.refreshToken(null, refreshArgs)
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'non-existent' });
      mockAuthService.getUserById.mockResolvedValue(null);

      // Act & Assert
      // The resolver catches the "User not found" error and rethrows as "Invalid refresh token"
      await expect(
        resolvers.Mutation.refreshToken(null, refreshArgs)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Query: me', () => {
    it('should return user when authenticated', async () => {
      // Arrange
      const mockContext = {
        auth: {
          user: {
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          },
        },
      };
      mockAuthService.getUserById.mockResolvedValue(mockUser);

      // Act
      const result = await resolvers.Query.me(null, {}, mockContext);

      // Assert
      expect(mockAuthService.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      // Arrange
      const mockContext = {
        auth: { user: null },
      };

      // Act & Assert
      await expect(
        resolvers.Query.me(null, {}, mockContext)
      ).rejects.toThrow('Not authenticated');
      expect(mockAuthService.getUserById).not.toHaveBeenCalled();
    });

    it('should throw error when user not found after authentication', async () => {
      // Arrange
      const mockContext = {
        auth: {
          user: {
            userId: 'deleted-user',
            email: 'deleted@example.com',
            role: 'CUSTOMER',
          },
        },
      };
      mockAuthService.getUserById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        resolvers.Query.me(null, {}, mockContext)
      ).rejects.toThrow('User not found');
    });
  });
});
