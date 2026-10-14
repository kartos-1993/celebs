import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { credentialRateLimiter, sessionRateLimiter } from '../rate-limiter.middleware';

describe('Credential vs Session Refresh Rate Limiter Isolation Contract', () => {
  function createTestApp() {
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());

    // Mock cookie parser for test
    app.use((req: Request, _res: Response, next) => {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const cookies: Record<string, string> = {};
        cookieHeader.split(';').forEach((part) => {
          const [key, val] = part.trim().split('=');
          if (key && val) cookies[key] = val;
        });
        req.cookies = cookies;
      }
      next();
    });

    app.post('/auth/login', credentialRateLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ success: true, endpoint: 'login' });
    });

    app.post('/auth/refresh', sessionRateLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ success: true, endpoint: 'refresh' });
    });

    return app;
  }

  it('exhausting credentialRateLimiter on an IP does NOT block legitimate session refreshes on that IP', async () => {
    const app = createTestApp();
    const officeIp = '198.51.100.22';

    // 1. Exhaust login quota on office IP (10 requests)
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/auth/login')
        .set('x-test-rate-limit', 'true')
        .set('X-Forwarded-For', officeIp)
        .send({ email: 'attacker@example.com' });
      expect(res.status).toBe(200);
    }

    // 11th login attempt is throttled
    const loginBlocked = await request(app)
      .post('/auth/login')
      .set('x-test-rate-limit', 'true')
      .set('X-Forwarded-For', officeIp)
      .send({ email: 'attacker@example.com' });
    expect(loginBlocked.status).toBe(429);

    // 2. Legitimate user on the SAME office IP performing session refresh must NOT be throttled
    const refreshAllowed = await request(app)
      .post('/auth/refresh')
      .set('x-test-rate-limit', 'true')
      .set('X-Forwarded-For', officeIp)
      .set('Cookie', 'refreshToken=session-token-legitimate-user-A')
      .send({});
    expect(refreshAllowed.status).toBe(200);
  });

  it('isolates refresh limits between different sessions sharing the same IP address', async () => {
    const app = createTestApp();
    const sharedIp = '198.51.100.33';

    // Session A exhausts its refresh quota (60 requests)
    for (let i = 0; i < 60; i++) {
      const res = await request(app)
        .post('/auth/refresh')
        .set('x-test-rate-limit', 'true')
        .set('X-Forwarded-For', sharedIp)
        .set('Cookie', 'refreshToken=session-token-exhausted-A')
        .send({});
      expect(res.status).toBe(200);
    }

    // 61st refresh for Session A is throttled
    const sessionABlocked = await request(app)
      .post('/auth/refresh')
      .set('x-test-rate-limit', 'true')
      .set('X-Forwarded-For', sharedIp)
      .set('Cookie', 'refreshToken=session-token-exhausted-A')
      .send({});
    expect(sessionABlocked.status).toBe(429);

    // Session B on the exact same IP must succeed without interference
    const sessionBAllowed = await request(app)
      .post('/auth/refresh')
      .set('x-test-rate-limit', 'true')
      .set('X-Forwarded-For', sharedIp)
      .set('Cookie', 'refreshToken=session-token-fresh-B')
      .send({});
    expect(sessionBAllowed.status).toBe(200);
  });
});
