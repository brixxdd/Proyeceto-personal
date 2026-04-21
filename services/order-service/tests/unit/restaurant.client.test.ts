import { fetchMenuItemPrices } from '../../src/clients/restaurant.client';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const makeResponse = (body: object, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('fetchMenuItemPrices', () => {
  const url = 'http://restaurant:3001';

  beforeEach(() => mockFetch.mockReset());

  it('returns price map for valid menu items', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      data: { menuItem: { id: 'item-1', price: 9.99, isAvailable: true } },
    }));

    const result = await fetchMenuItemPrices(['item-1'], url);
    expect(result.get('item-1')).toEqual({ price: 9.99, isAvailable: true });
  });

  it('handles multiple items', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({ data: { menuItem: { id: 'i1', price: 5.0, isAvailable: true } } }))
      .mockResolvedValueOnce(makeResponse({ data: { menuItem: { id: 'i2', price: 10.0, isAvailable: true } } }));

    const result = await fetchMenuItemPrices(['i1', 'i2'], url);
    expect(result.size).toBe(2);
    expect(result.get('i1')?.price).toBe(5.0);
    expect(result.get('i2')?.price).toBe(10.0);
  });

  it('throws when HTTP response not ok', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, false, 500));
    await expect(fetchMenuItemPrices(['item-1'], url)).rejects.toThrow('Restaurant service returned 500');
  });

  it('throws when menuItem not found', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { menuItem: null } }));
    await expect(fetchMenuItemPrices(['item-1'], url)).rejects.toThrow('Menu item not found: item-1');
  });

  it('throws when menuItem not available', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      data: { menuItem: { id: 'item-1', price: 9.99, isAvailable: false } },
    }));
    await expect(fetchMenuItemPrices(['item-1'], url)).rejects.toThrow('Menu item is not available: item-1');
  });

  it('throws when GraphQL errors returned', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      errors: [{ message: 'Not found' }],
    }));
    await expect(fetchMenuItemPrices(['item-1'], url)).rejects.toThrow('Restaurant service error for menuItem item-1');
  });
});
