import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { searchRateLimiter } from '../rate-limiter.middleware';

describe('Search & Public Catalog Rate Limiter Tiering Contract', () => {
  function createTestApp() {
    const app = express();
    app.set('trust proxy', 1);

    // Simulated auth populator
    app.use((req: Request, _res: Response, next) => {
      const auth = req.headers['authorization'];
      if (auth && auth.includes('authenticated-customer')) {
        req.user = { id: 'customer-123' } as Express.User;
      }
      next();
    });

    app.get('/storefront/home', searchRateLimiter, (_req: Request, res: Response) => {
      res.json({ success: true, composite: 'home' });
    });

    return app;
  }

  it('allocates 300 requests/minute to anonymous callers', async () => {
    const app = createTestApp();
    const clientIp = '203.0.113.101';

    // Verify rate limit responds successfully for standard calls
    const res = await request(app)
      .get('/storefront/home')
      .set('x-test-rate-limit', 'true')
      .set('X-Forwarded-For', clientIp);

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('300');
  });

  it('allocates elevated 600 requests/minute tier to authenticated callers', async () => {
    const app = createTestApp();
    const clientIp = '203.0.113.102';

    const res = await request(app)
      .get('/storefront/home')
      .set('x-test-rate-limit', 'true')
      .set('Authorization', 'Bearer authenticated-customer')
      .set('X-Forwarded-For', clientIp);

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('600');
  });
});
