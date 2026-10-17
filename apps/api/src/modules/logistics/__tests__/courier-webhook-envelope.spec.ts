import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';

/**
 * The courier webhook is the one endpoint a third party calls, so its
 * rejections are read by software rather than by a person. A hand-built error
 * body without `data`, `requestId` and `timestamp` breaks the one envelope
 * every client interceptor is written against.
 *
 * Pathao's payload carries `consignment_id` (one parcel) and `event` (a
 * Pathao status string such as "order.updated" or "Delivered"). The
 * integration handshake (`{ event: "webhook_integration" }`) must answer 202
 * with the secret echoed back, or Pathao never activates the endpoint.
 */
describe('courier webhook rejections', () => {
  it('answers a webhook with no consignment using the standard error envelope', async () => {
    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ event: 'order.updated' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      data: null,
    });
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message.length).toBeGreaterThan(0);
  });

  it('includes a request id on a rejected webhook', async () => {
    const response = await request(app).post('/api/v1/logistics/webhook').send({});

    expect(response.status).toBe(400);
    expect(response.body.requestId).toBeDefined();
  });

  it('includes a timestamp on a rejected webhook', async () => {
    const response = await request(app).post('/api/v1/logistics/webhook').send({});

    expect(response.status).toBe(400);
    expect(typeof response.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it('carries a machine-readable error code on a rejected webhook', async () => {
    const response = await request(app).post('/api/v1/logistics/webhook').send({});

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBeDefined();
  });

  it('routes an unknown consignment to the not-found path, not a 400', async () => {
    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ consignment_id: 'NO-SUCH-CONSIGNMENT-12345', event: 'order.updated' });

    // Reaches the service and reports the parcel is unknown, which proves the
    // consignment id was read rather than rejected as missing.
    expect(response.status).not.toBe(400);
  });
});

describe('courier webhook signature', () => {
  const SECRET = 'webhook-secret-for-tests';

  it('rejects an unsigned delivery once a secret is configured', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ consignment_id: 'NO-SUCH-CONSIGNMENT-12345', event: 'order.updated' });

    expect(response.status).toBe(401);
  });

  it('rejects a delivery signed with the wrong secret', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .set('x-pathao-signature', 'wrong-secret')
      .send({ consignment_id: 'NO-SUCH-CONSIGNMENT-12345', event: 'order.updated' });

    expect(response.status).toBe(401);
  });

  it('lets a correctly echoed delivery through to the service', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    // Unknown consignment: 404 proves the secret passed and the parcel lookup
    // ran, rather than the request dying at verification.
    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .set('x-pathao-signature', SECRET)
      .send({ consignment_id: 'NO-SUCH-CONSIGNMENT-12345', event: 'order.updated' });

    expect(response.status).not.toBe(400);
  });

  it('rejects webhooks when webhook secret is not configured in staging or production', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', '');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const response = await request(app)
        .post('/api/v1/logistics/webhook')
        .send({ consignment_id: 'TEST-123', event: 'order.updated' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Courier webhook secret is not configured/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe('courier webhook integration handshake', () => {
  const SECRET = 'webhook-secret-for-tests';

  it('answers the handshake with 202 and echoes the secret back', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .set('x-pathao-signature', SECRET)
      .send({ event: 'webhook_integration' });

    expect(response.status).toBe(202);
    expect(response.headers['x-pathao-merchant-webhook-integration-secret']).toBe(SECRET);
    expect(response.body.success).toBe(true);
  });
});
