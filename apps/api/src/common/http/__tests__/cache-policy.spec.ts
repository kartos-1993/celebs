import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { privateNoStore, publicCache } from '../cache-policy.middleware';

describe('Declarative Route-Level Cache Policy Middleware Contract', () => {
  function createTestApp() {
    const app = express();

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
});
