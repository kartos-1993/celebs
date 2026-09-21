import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/v1/orders';
const RANDOM_UUID = '123e4567-e89b-12d3-a456-426614174000';

async function makeCustomerToken(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      name: 'Test Customer',
      email: `esewa-cust-${Date.now()}-${Math.random().toString(36).slice(-5)}@test.com`,
      password: await hashValue('Password123!'),
      role: 'CUSTOMER',
      isEmailVerified: true,
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: 'esewa-form-auth' },
  });
  return signJwtToken({ userId: user.id, sessionId: session.id });
}

describe('eSewa payment form authentication and validation', () => {
  it('rejects unauthenticated form fetch with 401', async () => {
    const res = await request(app).get(`${BASE}/payments/esewa/form/${RANDOM_UUID}`);
    expect(res.status).toBe(401);
  });

  it('rejects authenticated form fetch with invalid orderId format with 400', async () => {
    const token = await makeCustomerToken();
    const res = await request(app)
      .get(`${BASE}/payments/esewa/form/not-a-valid-uuid`)
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });
});
