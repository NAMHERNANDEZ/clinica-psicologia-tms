import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createAccessToken, createRefreshToken, verifyToken } from '../src/lib/auth';

const TEST_ENV = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-2024',
  REFRESH_SECRET: 'test-refresh-secret-key-for-testing-2024',
  ALLOWED_ORIGINS: 'http://localhost:5173',
} as any;

const TEST_USER = {
  id: 1,
  email: 'test@example.com',
  role: 'admin' as const,
};

describe('Auth', () => {
  describe('Password Hashing', () => {
    it('should hash password', async () => {
      const hash = await hashPassword('password123');
      expect(hash).toContain(':');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should verify correct password', async () => {
      const hash = await hashPassword('password123');
      const valid = await verifyPassword('password123', hash);
      expect(valid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('password123');
      const valid = await verifyPassword('wrongpassword', hash);
      expect(valid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword('password123');
      const hash2 = await hashPassword('password123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT Tokens', () => {
    it('should create access token', async () => {
      const token = await createAccessToken(TEST_ENV, TEST_USER);
      expect(token.split('.')).toHaveLength(3);
    });

    it('should create refresh token', async () => {
      const token = await createRefreshToken(TEST_ENV, TEST_USER);
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify valid access token', async () => {
      const token = await createAccessToken(TEST_ENV, TEST_USER);
      const payload = await verifyToken(TEST_ENV.JWT_SECRET, token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe(TEST_USER.id);
      expect(payload?.email).toBe(TEST_USER.email);
      expect(payload?.role).toBe(TEST_USER.role);
      expect(payload?.type).toBe('access');
    });

    it('should verify valid refresh token', async () => {
      const token = await createRefreshToken(TEST_ENV, TEST_USER);
      const payload = await verifyToken(TEST_ENV.REFRESH_SECRET, token);
      expect(payload).not.toBeNull();
      expect(payload?.type).toBe('refresh');
    });

    it('should reject token with wrong secret', async () => {
      const token = await createAccessToken(TEST_ENV, TEST_USER);
      const payload = await verifyToken('wrong-secret', token);
      expect(payload).toBeNull();
    });

    it('should reject invalid token format', async () => {
      const payload = await verifyToken(TEST_ENV.JWT_SECRET, 'invalid-token');
      expect(payload).toBeNull();
    });
  });
});
