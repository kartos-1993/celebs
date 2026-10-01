import request from 'supertest';
import { describe, expect, it } from 'vitest';

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
