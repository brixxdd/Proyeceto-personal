import jwt from 'jsonwebtoken';
import { verifyToken, extractAuthContext, requireAuth } from '../../src/middleware/auth';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const SECRET = process.env.JWT_SECRET!;

const makeToken = (payload: object, secret = SECRET, options: jwt.SignOptions = {}) =>
  jwt.sign(payload, secret, { expiresIn: '1h', ...options });

describe('verifyToken', () => {
  it('returns payload for valid token', () => {
    const token = makeToken({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
    const result = verifyToken(token);
    expect(result).toMatchObject({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
  });

  it('returns null for expired token', () => {
    const token = makeToken({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' }, SECRET, { expiresIn: -1 });
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = makeToken({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' }, 'wrong-secret');
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for malformed token', () => {
    expect(verifyToken('not.a.token')).toBeNull();
  });

  it('returns null when JWT_SECRET missing', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const token = makeToken({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' }, original);
    expect(verifyToken(token)).toBeNull();
    process.env.JWT_SECRET = original;
  });
});

describe('extractAuthContext', () => {
  it('returns unauthenticated when no header', () => {
    expect(extractAuthContext(undefined)).toEqual({ isAuthenticated: false });
  });

  it('returns unauthenticated for invalid format', () => {
    expect(extractAuthContext('InvalidHeader')).toEqual({ isAuthenticated: false });
    expect(extractAuthContext('Bearer')).toEqual({ isAuthenticated: false });
  });

  it('returns authenticated context for valid Bearer token', () => {
    const token = makeToken({ userId: 'u1', email: 'a@b.com', role: 'ADMIN' });
    const ctx = extractAuthContext(`Bearer ${token}`);
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.user?.userId).toBe('u1');
    expect(ctx.user?.role).toBe('ADMIN');
  });

  it('returns unauthenticated for expired token', () => {
    const token = makeToken({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' }, SECRET, { expiresIn: -1 });
    expect(extractAuthContext(`Bearer ${token}`)).toEqual({ isAuthenticated: false });
  });
});

describe('requireAuth', () => {
  it('returns user when authenticated', () => {
    const user = { userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' };
    const result = requireAuth({ isAuthenticated: true, user });
    expect(result).toEqual(user);
  });

  it('throws when not authenticated', () => {
    expect(() => requireAuth({ isAuthenticated: false })).toThrow('Unauthorized');
  });

  it('throws when authenticated but no user object', () => {
    expect(() => requireAuth({ isAuthenticated: true, user: undefined })).toThrow('Unauthorized');
  });
});
