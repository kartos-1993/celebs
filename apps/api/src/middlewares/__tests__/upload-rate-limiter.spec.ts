import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { uploadRateLimiter } from '../rate-limiter.middleware';

describe('Upload Rate Limiter User-Scoped Throttling', () => {
  function createTestApp() {
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());

    // Middleware to simulate optional authenticated user from header
    app.use((req: Request, _res: Response, next) => {
      const userId = req.headers['x-test-user-id'];
      if (userId && typeof userId === 'string') {
        req.user = {
          id: userId,
          email: `${userId}@example.com`,
          name: 'Test User',
          role: 'VENDOR',
          isEmailVerified: true,
        } as unknown as Express.User;
      }
      next();
    });

    app.use('/media/upload', uploadRateLimiter);
    app.post('/media/upload', (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });

    return app;
  }

  it('throttles authenticated user based on user ID even across rotating IP addresses', async () => {
    const app = createTestApp();
    const userId = 'vendor-user-123';

    // Fire 30 allowed requests with rotating IP addresses
    for (let i = 0; i < 30; i++) {
      const res = await request(app)
        .post('/media/upload')
        .set('x-test-rate-limit', 'true')
        .set('x-test-user-id', userId)
        .set('X-Forwarded-For', `192.168.1.${i + 1}`)
        .send({});
      expect(res.status).toBe(200);
    }

    // 31st request with a brand new IP address must be blocked by user ID quota
    const blockedRes = await request(app)
      .post('/media/upload')
      .set('x-test-rate-limit', 'true')
      .set('x-test-user-id', userId)
      .set('X-Forwarded-For', '10.99.99.99')
      .send({});

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.errorCode).toBe('TOO_MANY_REQUESTS');
  });

  it('isolates rate limit quotas between different authenticated users on the same IP', async () => {
    const app = createTestApp();
    const sharedIp = '203.0.113.50';

    // Exhaust quota for User A
    for (let i = 0; i < 30; i++) {
      await request(app)
        .post('/media/upload')
        .set('x-test-rate-limit', 'true')
        .set('x-test-user-id', 'user-A')
        .set('X-Forwarded-For', sharedIp)
        .send({});
    }

    // User A is now throttled
    const userABlocked = await request(app)
      .post('/media/upload')
      .set('x-test-rate-limit', 'true')
      .set('x-test-user-id', 'user-A')
      .set('X-Forwarded-For', sharedIp)
      .send({});
    expect(userABlocked.status).toBe(429);

    // User B on the SAME shared IP must NOT be throttled
    const userBAllowed = await request(app)
      .post('/media/upload')
      .set('x-test-rate-limit', 'true')
      .set('x-test-user-id', 'user-B')
      .set('X-Forwarded-For', sharedIp)
      .send({});
    expect(userBAllowed.status).toBe(200);
  });
});
