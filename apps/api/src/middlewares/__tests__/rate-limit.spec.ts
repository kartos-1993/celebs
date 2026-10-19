import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

const uniq = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * The media router mounts its rate limiter after identity so the upload quota
 * is keyed by user rather than a shared IP (2c950fb9). A media request must
 * therefore carry a real vendor session to reach the limiter at all.
 */
async function mkVendorToken(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      name: 'Rate Limit Vendor',
      email: `${uniq('rl')}@rate-limit.test`,
      password: await hashValue('Password123!'),
      role: 'VENDOR',
      isEmailVerified: true,
    },
  });
  await prisma.vendorProfile.create({
    data: {
      userId: user.id,
      shopName: uniq('Rate Limit Shop'),
      phoneNumber: uniq('980'),
      panNumber: uniq('PAN'),
      citizenshipNumber: uniq('CIT'),
      status: 'PENDING',
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: 'rate-limit' },
  });
  return signJwtToken({ userId: user.id, sessionId: session.id });
}

describe('Rate Limiting System', () => {
  describe('Auth Rate Limiter (/api/v1/auth/*)', () => {
    it('should allow requests within rate limit when test header is set', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('x-test-rate-limit', 'true')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });

      // Should process login request (returns 401/400, not 429)
      expect(res.status).not.toBe(429);
    });

    it('should return 429 Too Many Requests when auth limit (10) is exceeded', async () => {
      let lastRes: request.Response | undefined;
      for (let i = 0; i < 11; i++) {
        lastRes = await request(app)
          .post('/api/v1/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ email: `test${i}@example.com`, password: 'password123' });
      }

      expect(lastRes?.status).toBe(429);
      expect(lastRes?.body.success).toBe(false);
      expect(lastRes?.body.errorCode).toBe('TOO_MANY_REQUESTS');
      expect(lastRes?.body.message).toContain('Too many requests');
    });
  });

  describe('Media Upload Rate Limiter (/api/v1/media/*)', () => {
    it('should return 429 Too Many Requests when upload limit (30) is exceeded', async () => {
      const token = await mkVendorToken();

      let lastRes: request.Response | undefined;
      for (let i = 0; i < 31; i++) {
        lastRes = await request(app)
          .post('/api/v1/media/presign')
          .set('x-test-rate-limit', 'true')
          .set('Authorization', `Bearer ${token}`)
          .send({});
      }

      expect(lastRes?.status).toBe(429);
      expect(lastRes?.body.success).toBe(false);
      expect(lastRes?.body.errorCode).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('Product Search Rate Limiter (/api/v1/products)', () => {
    it('should process unauthenticated search queries normally under limit', async () => {
      const res = await request(app).get('/api/v1/products').set('x-test-rate-limit', 'true');

      expect(res.status).not.toBe(429);
    });
  });
});
