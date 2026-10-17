import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { expectCorsExposes } from '../../../tests/support/http-headers';

import app from '@/app';

describe('CORS Gateway Configuration and Preflight Contract', () => {
  it('serves 24-hour preflight cache directive on OPTIONS request', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-max-age']).toBe('86400');
  });

  it('allows conditional revalidation headers in preflight', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'if-none-match, if-modified-since');

    const allowHeaders = (res.headers['access-control-allow-headers'] || '').toLowerCase();
    expect(allowHeaders).toContain('if-none-match');
    expect(allowHeaders).toContain('if-modified-since');
  });

  it('exposes essential cache, rate-limit, and diagnostic headers', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:3000');

    expectCorsExposes(res, [
      'etag',
      'retry-after',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
      'x-session-id',
      'x-request-id',
    ]);
  });

  it('allows credentials for authorized origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not reflect access-control-allow-origin for untrusted external origins in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://unauthorized-attacker.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
