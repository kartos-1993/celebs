import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { expectNoStore } from '../../../../tests/support/http-headers';

import app from '@/app';

describe('Health Endpoint Cache-Control Contract', () => {
  it('strictly emits no-store and no-cache directives to prevent stale health checks on root /health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  it('strictly emits no-store and no-cache directives on base path /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expectNoStore(res);
  });
});
