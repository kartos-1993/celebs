import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { privateNoStore, publicCache } from '../cache-policy.middleware';

import type { Actor } from '@/common/context/actor-context';

describe('Declarative Route-Level Cache Policy Middleware Contract', () => {
  function createTestApp() {
    const app = express();

    // Simulates the production pipeline upstream of the cache middleware:
    // cookieParser → optionalAuthenticateJWT → optionalActorContext.
    app.use((req: Request, _res: Response, next) => {
      if (req.headers['x-test-actor'] === 'seller') {
        req.actor = {
          userId: 'user-1',
          sessionId: 'session-1',
          email: 'seller@example.com',
          role: 'VENDOR',
          permissions: [],
          isEmailVerified: true,
        } satisfies Actor;
      }
      if (req.headers['x-test-user'] === '1') {
        req.user = { id: 'user-1', sessionId: 'session-1', role: 'VENDOR' };
      }
      const cookieHeader = req.headers.cookie;
      if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
        req.cookies = Object.fromEntries(
          cookieHeader.split(';').map((pair) => {
            const [name, ...value] = pair.trim().split('=');
            return [name, value.join('=')];
          }),
        );
      }
      next();
    });

    app.get(
      '/public-feed',
      publicCache({ maxAge: 60, sMaxAge: 300, swr: 120 }),
      (_req: Request, res: Response) => {
        res.json({ success: true, type: 'feed' });
      },
    );

    app.get('/simple-public', publicCache({ maxAge: 30 }), (_req: Request, res: Response) => {
      res.json({ success: true, type: 'simple' });
    });

    app.get('/private-account', privateNoStore(), (_req: Request, res: Response) => {
      res.json({ success: true, type: 'account' });
    });

    return app;
  }

  it('sets public, max-age, s-maxage, and stale-while-revalidate directives with Vary header', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=120',
    );
    expect(res.headers['vary']).toContain('Accept-Encoding');
  });

  it('sets standard public caching directives when sMaxAge and swr are omitted', async () => {
    const app = createTestApp();
    const res = await request(app).get('/simple-public');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=30');
    expect(res.headers['vary']).toContain('Accept-Encoding');
  });

  it('sets strict private, no-store, and pragma headers on private reads', async () => {
    const app = createTestApp();
    const res = await request(app).get('/private-account');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('degrades public reads to private, no-store when an authenticated actor is resolved', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed').set('x-test-actor', 'seller');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('degrades public reads to private, no-store when only req.user is resolved', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed').set('x-test-user', '1');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
  });

  it('degrades public reads to private, no-store when bearer credentials are present', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed').set('Authorization', 'Bearer token-123');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
  });

  it('degrades public reads to private, no-store when auth cookies are present', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed').set('Cookie', 'accessToken=opaque-token');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
  });

  it('keeps public caching for storefront requests carrying only a guest session cookie', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed').set('Cookie', 'sessionId=guest-cart-1');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=120',
    );
  });

  it('varies public responses on Authorization and X-Surface to keep elevated shapes out of shared entries', async () => {
    const app = createTestApp();
    const res = await request(app).get('/public-feed');

    const vary = String(res.headers['vary']);
    expect(vary).toContain('Accept-Encoding');
    expect(vary).toContain('Authorization');
    expect(vary).toContain('X-Surface');
  });
});
