import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';

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
      let lastRes: any;
      for (let i = 0; i < 11; i++) {
        lastRes = await request(app)
          .post('/api/v1/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ email: `test${i}@example.com`, password: 'password123' });
      }

      expect(lastRes.status).toBe(429);
      expect(lastRes.body.success).toBe(false);
      expect(lastRes.body.errorCode).toBe('TOO_MANY_REQUESTS');
      expect(lastRes.body.message).toContain('Too many requests');
    });
  });

  describe('Media Upload Rate Limiter (/api/v1/media/*)', () => {
    it('should return 429 Too Many Requests when upload limit (30) is exceeded', async () => {
      let lastRes: any;
      for (let i = 0; i < 31; i++) {
        lastRes = await request(app)
          .post('/api/v1/media/upload')
          .set('x-test-rate-limit', 'true');
      }

      expect(lastRes.status).toBe(429);
      expect(lastRes.body.success).toBe(false);
      expect(lastRes.body.errorCode).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('Product Search Rate Limiter (/api/v1/products)', () => {
    it('should process unauthenticated search queries normally under limit', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('x-test-rate-limit', 'true');

      expect(res.status).not.toBe(429);
    });
  });
});
