import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';

describe('HTTP Request ID Sanitization and Propagation Contract', () => {
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('accepts and propagates valid alphanumeric request IDs', async () => {
    const validId = 'client-req-123_abc';
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', validId);

    expect(res.headers['x-request-id']).toBe(validId);
  });

  it('rejects and replaces request IDs containing dangerous or non-alphanumeric characters', async () => {
    const maliciousId = 'bad-id;<script>alert(1)</script>';
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', maliciousId);

    const resultingId = res.headers['x-request-id'];
    expect(resultingId).not.toBe(maliciousId);
    expect(resultingId).toMatch(UUID_V4_REGEX);
  });

  it('rejects and replaces excessively long request IDs exceeding 64 characters', async () => {
    const excessivelyLongId = 'a'.repeat(65);
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', excessivelyLongId);

    const resultingId = res.headers['x-request-id'];
    expect(resultingId).not.toBe(excessivelyLongId);
    expect(resultingId).toMatch(UUID_V4_REGEX);
  });

  it('generates a fresh UUID v4 when request ID header is missing', async () => {
    const res = await request(app).get('/api/v1/health');

    const resultingId = res.headers['x-request-id'];
    expect(resultingId).toBeDefined();
    expect(resultingId).toMatch(UUID_V4_REGEX);
  });
});
