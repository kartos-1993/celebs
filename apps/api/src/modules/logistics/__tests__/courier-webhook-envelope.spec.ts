import { createHmac } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';

/**
 * The courier webhook is the one endpoint a third party calls, so its rejections
 * are read by software rather than by a person. A hand-built error body without
 * `data`, `requestId` and `timestamp` breaks the one envelope every client
 * interceptor is written against.
 */
describe('courier webhook rejections', () => {
  it('answers a webhook with no tracking number using the standard error envelope', async () => {
    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ status: 'OUT_FOR_DELIVERY' });

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

  // A courier sends the same event under different field names; all three are real.
  it.each(['trackingNumber', 'waybillNumber', 'waybillId'])(
    'accepts the %s field as the tracking number',
    async (field) => {
      const response = await request(app)
        .post('/api/v1/logistics/webhook')
        .send({ [field]: 'NO-SUCH-WAYBILL-12345' });

      // Reaches the service and reports the parcel is unknown, which proves the
      // tracking number was read rather than rejected as missing.
      expect(response.status).not.toBe(400);
    },
  );
});

describe('courier webhook signature', () => {
  const SECRET = 'webhook-secret-for-tests';

  const signed = (payload: unknown, secret: string = SECRET) => {
    const raw = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    return request(app)
      .post('/api/v1/logistics/webhook')
      .set('Content-Type', 'application/json')
      .set('x-pathao-signature', signature)
      .send(raw);
  };

  it('lets a correctly signed delivery through to the service', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    // Unknown waybill: 404 proves the signature passed and the parcel lookup
    // ran, rather than the request dying at verification.
    const response = await signed({ trackingNumber: 'NO-SUCH-WAYBILL-12345' });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(400);
  });

  it('rejects a delivery signed with the wrong secret', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    const response = await signed({ trackingNumber: 'NO-SUCH-WAYBILL-12345' }, 'wrong-secret');

    expect(response.status).toBe(401);
  });

  it('rejects an unsigned delivery once a secret is configured', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ trackingNumber: 'NO-SUCH-WAYBILL-12345' });

    expect(response.status).toBe(401);
  });

  it('rejects a signed-looking delivery whose body was tampered with', async () => {
    vi.stubEnv('PATHAO_WEBHOOK_SECRET', SECRET);

    const raw = JSON.stringify({ trackingNumber: 'NO-SUCH-WAYBILL-12345' });
    const signature = createHmac('sha256', SECRET).update(raw).digest('hex');

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .set('Content-Type', 'application/json')
      .set('x-pathao-signature', signature)
      // Still valid JSON, but no longer the bytes that were signed.
      .send(raw.replace('12345', '12346'));

    expect(response.status).toBe(401);
  });
});
