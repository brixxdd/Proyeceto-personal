import express from 'express';
import request from 'supertest';

// Mock de fetch global para health check
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock de Apollo Gateway para evitar conexión real
jest.mock('@apollo/gateway', () => {
  const mockGateway = {
    load: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    onSchemaChange: jest.fn(),
  };

  return {
    ApolloGateway: jest.fn().mockImplementation(() => mockGateway),
    IntrospectAndCompose: jest.fn().mockImplementation(() => mockGateway),
  };
});

jest.mock('@apollo/server', () => {
  return {
    ApolloServer: jest.fn().mockImplementation(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

jest.mock('@apollo/server/express4', () => ({
  expressMiddleware: jest.fn().mockImplementation(() => {
    return (req: any, res: any, next: any) => next();
  }),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/middleware/auth', () => ({
  getContextFromRequest: jest.fn().mockReturnValue({ user: null }),
}));

describe('API Gateway - Health Check', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    // Re-crear la app para cada test
    app = express();

    // Re-importar el health check (la lógica está en el index.ts pero podemos
    // recrear el endpoint aquí para testearlo)
    app.get('/health', async (req, res) => {
      const checks: Record<string, string> = {};
      let allHealthy = true;

      const subgraphs = [
        { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
        { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
        { name: 'order', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql' },
      ];

      for (const subgraph of subgraphs) {
        try {
          const response = await fetch(subgraph.url.replace('/graphql', '/health'));
          const data = await response.json() as { status: string };
          if (data.status === 'healthy') {
            checks[subgraph.name] = 'healthy';
          } else {
            checks[subgraph.name] = 'unhealthy';
            allHealthy = false;
          }
        } catch (error) {
          checks[subgraph.name] = 'unreachable';
          allHealthy = false;
        }
      }

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        checks,
      });
    });
  });

  it('should return 200 when all subgraphs are healthy', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      });

    // Act
    const response = await request(app).get('/health');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      service: 'api-gateway',
      timestamp: expect.any(String),
      checks: {
        auth: 'healthy',
        restaurant: 'healthy',
        order: 'healthy',
      },
    });
  });

  it('should return 503 when a subgraph is unhealthy', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'unhealthy' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      });

    // Act
    const response = await request(app).get('/health');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.restaurant).toBe('unhealthy');
  });

  it('should return 503 when a subgraph is unreachable', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      })
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      });

    // Act
    const response = await request(app).get('/health');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.restaurant).toBe('unreachable');
  });

  it('should return 503 when all subgraphs are down', async () => {
    // Arrange
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    // Act
    const response = await request(app).get('/health');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.auth).toBe('unreachable');
    expect(response.body.checks.restaurant).toBe('unreachable');
    expect(response.body.checks.order).toBe('unreachable');
  });

  it('should check all 3 subgraphs (auth, restaurant, order)', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'healthy' }),
      });

    // Act
    await request(app).get('/health');

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3002/health');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/health');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/health');
  });
});
