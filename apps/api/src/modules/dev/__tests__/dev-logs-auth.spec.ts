import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/v1/dev/logs';

async function makeAdminToken(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      name: 'Logs Admin',
      email: `logs-admin-${Date.now()}@test.com`,
      password: await hashValue('Password123!'),
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: 'dev-logs-auth' },
  });
  return signJwtToken({ userId: user.id, sessionId: session.id });
}

describe('development log viewer authentication', () => {
  it('rejects anonymous viewers with 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('allows platform admins with a login token and no shared secret', async () => {
    const token = await makeAdminToken();
    const res = await request(app)
      .get(BASE)
      .set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
  });

  it('rejects shared-secret query access without a login token', async () => {
    const secret = process.env.SETUP_SECRET ?? '';
    const res = await request(app).get(`${BASE}?secret=${encodeURIComponent(secret)}`);
    expect(res.status).toBe(401);
  });
});
