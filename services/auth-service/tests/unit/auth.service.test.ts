import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { AuthService, CreateUserInput } from '../../src/services/auth.service';
import * as authMiddleware from '../../src/middleware/auth';

// Mock de dependencias externas
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockPool: any;
  let mockClient: any;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    role: 'CUSTOMER',
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const createUserInput: CreateUserInput = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    phone: '+1234567890',
    role: 'CUSTOMER',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = new Pool();
    mockPool.connect.mockResolvedValue(mockClient);

    service = new AuthService(mockPool);

    // Mock defaults para tokens
    (authMiddleware.generateToken as jest.Mock).mockReturnValue('mock-token');
    (authMiddleware.generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
  });

  describe('createUser', () => {
    it('should create a user successfully and return auth payload', async () => {
      // Arrange
      // Primera llamada: BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Segunda llamada: SELECT existing user (no existe)
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Tercera llamada: INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          role: mockUser.role,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at,
        }],
      });
      // Cuarta llamada: COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Act
      const result = await service.createUser(createUserInput);

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'test@example.com',
          'hashed-password',
          'Test User',
          '+1234567890',
          'CUSTOMER',
        ])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(authMiddleware.generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(authMiddleware.generateRefreshToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(result).toEqual({
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          role: mockUser.role,
          createdAt: mockUser.created_at.toISOString(),
          updatedAt: mockUser.updated_at.toISOString(),
        },
      });
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }); // existing user

      // Act & Assert
      await expect(service.createUser(createUserInput)).rejects.toThrow(
        'Email already registered'
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT'));
    });

    it('should rollback on database error', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT (no existing)
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockClient.query.mockRejectedValueOnce(new Error('Database error')); // INSERT falla

      // Act & Assert
      await expect(service.createUser(createUserInput)).rejects.toThrow('Database error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle null phone correctly', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: null,
          role: mockUser.role,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const inputWithoutPhone = { ...createUserInput, phone: undefined };

      // Act
      await service.createUser(inputWithoutPhone);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([null])
      );
    });

    it('should create user with different roles', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT
      mockClient.query.mockResolvedValueOnce({
        rows: [{ ...mockUser, role: 'RESTAURANT_OWNER' }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const inputWithOwnerRole = {
        ...createUserInput,
        role: 'RESTAURANT_OWNER' as const,
      };

      // Act
      const result = await service.createUser(inputWithOwnerRole);

      // Assert
      expect(result.user.role).toBe('RESTAURANT_OWNER');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['RESTAURANT_OWNER'])
      );
    });
  });

  describe('login', () => {
    const loginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{
          ...mockUser,
          password_hash: 'hashed-password',
        }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.login(loginInput);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(authMiddleware.generateToken).toHaveBeenCalled();
      expect(authMiddleware.generateRefreshToken).toHaveBeenCalled();
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(service.login(loginInput)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockUser, password_hash: 'hashed-password' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginInput)).rejects.toThrow('Invalid credentials');
    });

    it('should not return password_hash in user object', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockUser, password_hash: 'hashed-password' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.login(loginInput);

      // Assert
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          role: mockUser.role,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at,
        }],
      });

      // Act
      const result = await service.getUserById(mockUser.id);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, name'),
        [mockUser.id]
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        phone: mockUser.phone,
        role: mockUser.role,
        createdAt: mockUser.created_at.toISOString(),
        updatedAt: mockUser.updated_at.toISOString(),
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await service.getUserById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should not return password_hash even if query returns it', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          role: mockUser.role,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at,
          password_hash: 'should-not-be-included',
        }],
      });

      // Act
      const result = await service.getUserById(mockUser.id);

      // Assert
      expect(result).not.toHaveProperty('password_hash');
    });
  });
});
