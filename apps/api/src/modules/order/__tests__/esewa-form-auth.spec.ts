import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/v1/orders';
const RANDOM_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('eSewa payment form authentication', () => {
  it('rejects unauthenticated form fetch with 401', async () => {
    const res = await request(app).get(`${BASE}/payments/esewa/form/${RANDOM_UUID}`);
    expect(res.status).toBe(401);
  });
});
