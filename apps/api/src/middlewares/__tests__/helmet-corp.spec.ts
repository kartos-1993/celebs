import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';

describe('Cross-Origin Resource Policy (CORP) Security Header Contract', () => {
  it('serves cross-origin CORP header to enable safe multi-origin asset loading', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
