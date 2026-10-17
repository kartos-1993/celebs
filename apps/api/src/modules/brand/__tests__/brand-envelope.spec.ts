import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';

describe('Standardized API Response Envelope Contract on Brand Endpoints', () => {
  it('returns canonical IApiResponse envelope with requestId and timestamp on getAllBrands', async () => {
    const res = await request(app).get('/api/v1/brands');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Brands retrieved successfully');
    expect(res.body.data).toBeDefined();

    // Mandatory envelope fields enforced by Gate 7
    expect(res.body.requestId).toBeDefined();
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });
});
