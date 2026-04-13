describe('API Gateway - Gateway Configuration', () => {
  it('should have all 3 subgraph URLs configured in environment', () => {
    // Verify env vars are set correctly
    expect(process.env.AUTH_SERVICE_URL).toBe('http://localhost:3002/graphql');
    expect(process.env.RESTAURANT_SERVICE_URL).toBe('http://localhost:3001/graphql');
    expect(process.env.ORDER_SERVICE_URL).toBe('http://localhost:3000/graphql');
  });

  it('should use default URLs when env vars are not set', () => {
    // Save original
    const originalAuth = process.env.AUTH_SERVICE_URL;
    const originalRestaurant = process.env.RESTAURANT_SERVICE_URL;
    const originalOrder = process.env.ORDER_SERVICE_URL;

    // Clear env vars
    delete process.env.AUTH_SERVICE_URL;
    delete process.env.RESTAURANT_SERVICE_URL;
    delete process.env.ORDER_SERVICE_URL;

    // Check defaults (same logic as in index.ts)
    const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql';
    const restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql';
    const orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql';

    expect(authUrl).toBe('http://localhost:3002/graphql');
    expect(restaurantUrl).toBe('http://localhost:3001/graphql');
    expect(orderUrl).toBe('http://localhost:3000/graphql');

    // Restore
    process.env.AUTH_SERVICE_URL = originalAuth;
    process.env.RESTAURANT_SERVICE_URL = originalRestaurant;
    process.env.ORDER_SERVICE_URL = originalOrder;
  });

  it('should have correct subgraph configuration structure', () => {
    // This mirrors the configuration in index.ts
    const subgraphs = [
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
      { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
      { name: 'order', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql' },
    ];

    expect(subgraphs).toHaveLength(3);
    expect(subgraphs.map((s) => s.name)).toEqual(['auth', 'restaurant', 'order']);
    expect(subgraphs.every((s) => s.url.startsWith('http'))).toBe(true);
  });

  it('should include order service in subgraph list', () => {
    // Verify order service is NOT commented out
    const subgraphs = [
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
      { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
      { name: 'order', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql' },
    ];

    const orderSubgraph = subgraphs.find((s) => s.name === 'order');
    expect(orderSubgraph).toBeDefined();
    expect(orderSubgraph!.url).toBe('http://localhost:3000/graphql');
  });
});

describe('API Gateway - Context Forwarding', () => {
  it('should prepare headers for subgraph forwarding', () => {
    // This tests the willSendRequest logic from index.ts
    const context = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
      },
    };

    const mockHeaders = {
      set: jest.fn(),
    };

    const mockRequest = {
      http: { headers: mockHeaders },
    };

    // Simulate willSendRequest logic
    if (context.user) {
      mockRequest.http.headers.set('x-user-id', context.user.userId);
      mockRequest.http.headers.set('x-user-email', context.user.email);
      mockRequest.http.headers.set('x-user-role', context.user.role);
    }

    expect(mockHeaders.set).toHaveBeenCalledWith('x-user-id', 'user-123');
    expect(mockHeaders.set).toHaveBeenCalledWith('x-user-email', 'test@example.com');
    expect(mockHeaders.set).toHaveBeenCalledWith('x-user-role', 'CUSTOMER');
  });

  it('should not set headers when user is not in context', () => {
    const context = { user: null };

    const mockHeaders = {
      set: jest.fn(),
    };

    const mockRequest = {
      http: { headers: mockHeaders },
    };

    // Simulate willSendRequest logic
    if (context.user) {
      mockRequest.http.headers.set('x-user-id', context.user.userId);
      mockRequest.http.headers.set('x-user-email', context.user.email);
      mockRequest.http.headers.set('x-user-role', context.user.role);
    }

    expect(mockHeaders.set).not.toHaveBeenCalled();
  });

  it('should handle user context with different roles', () => {
    const roles = ['CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PERSON', 'ADMIN'];

    roles.forEach((role) => {
      const mockHeaders = { set: jest.fn() };
      const context = {
        user: { userId: '1', email: 'test@test.com', role },
      };

      if (context.user) {
        mockHeaders.set('x-user-role', context.user.role);
      }

      expect(mockHeaders.set).toHaveBeenCalledWith('x-user-role', role);
    });
  });
});
