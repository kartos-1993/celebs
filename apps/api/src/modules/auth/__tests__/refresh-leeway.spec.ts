import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

const TEST_ORIGIN = 'http://localhost:5173';
const TEST_UA = 'RefreshLeewayTest/1.0';
const OTHER_UA = 'TotallyDifferentScraper/9.9';

function extractRefreshToken(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined;
  const joined = Array.isArray(raw) ? raw.join(';') : (raw ?? '');
  return joined.match(/refreshToken=([^;]+)/)?.[1] ?? '';
}

async function createVerifiedUser() {
  const rawPassword = 'Password123!';
  const email = faker.internet.exampleEmail().toLowerCase();
  const user = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email,
      password: await hashValue(rawPassword),
      isEmailVerified: true,
    },
  });
  return { user, rawPassword, email };
}

async function loginAgent(email: string, password: string, userAgent: string) {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .set('Origin', TEST_ORIGIN)
    .set('User-Agent', userAgent)
    .send({ email, password });
  expect(loginRes.status).toBe(200);
  const token = extractRefreshToken(loginRes);
  expect(token).not.toBe('');
  return token;
}

function refreshWith(token: string, userAgent: string) {
  return request(app)
    .post('/api/v1/auth/refresh')
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', `refreshToken=${token}`)
    .set('User-Agent', userAgent);
}

describe('Refresh Token Leeway & Grace Test Suite', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('accepts one previous-token replay with the same fingerprint and keeps the session alive', async () => {
    const { user, rawPassword, email } = await createVerifiedUser();
    createdUserId = user.id;

    const token1 = await loginAgent(email, rawPassword, TEST_UA);
    const firstRefresh = await refreshWith(token1, TEST_UA);
    expect(firstRefresh.status).toBe(200);
    const token2 = extractRefreshToken(firstRefresh);
    expect(token2).not.toBe('');
    expect(token2).not.toEqual(token1);

    // Lost-response retry: same old token, same device.
    const retryRes = await refreshWith(token1, TEST_UA);
    expect(retryRes.status).toBe(200);
    expect(extractRefreshToken(retryRes)).not.toBe('');

    // Session family must survive a benign retry.
    const sessionInDb = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(sessionInDb).not.toBeNull();

    // The current token still works afterwards.
    const currentRes = await refreshWith(token2, TEST_UA);
    expect(currentRes.status).toBe(200);
  });

  it('revokes all sessions after repeated previous-token replays beyond the grace budget', async () => {
    const { user, rawPassword, email } = await createVerifiedUser();
    createdUserId = user.id;

    const token1 = await loginAgent(email, rawPassword, TEST_UA);
    const firstRefresh = await refreshWith(token1, TEST_UA);
    expect(firstRefresh.status).toBe(200);

    // Grace covers a handful of retries; the fourth consecutive replay trips revocation.
    expect((await refreshWith(token1, TEST_UA)).status).toBe(200);
    expect((await refreshWith(token1, TEST_UA)).status).toBe(200);
    expect((await refreshWith(token1, TEST_UA)).status).toBe(200);
    const revoked = await refreshWith(token1, TEST_UA);
    expect(revoked.status).toBe(401);

    const sessionInDb = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(sessionInDb).toBeNull();
  });

  it('revokes sessions immediately when a previous token arrives with a different fingerprint', async () => {
    const { user, rawPassword, email } = await createVerifiedUser();
    createdUserId = user.id;

    const token1 = await loginAgent(email, rawPassword, TEST_UA);
    const firstRefresh = await refreshWith(token1, TEST_UA);
    expect(firstRefresh.status).toBe(200);

    // Same old token, different device signature: treated as theft on first sight.
    const attackerRes = await refreshWith(token1, OTHER_UA);
    expect(attackerRes.status).toBe(401);

    const sessionInDb = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(sessionInDb).toBeNull();
  });

  it('shares one rotation result across concurrent identical refresh requests', async () => {
    const { user, rawPassword, email } = await createVerifiedUser();
    createdUserId = user.id;

    const token1 = await loginAgent(email, rawPassword, TEST_UA);

    const [first, second] = await Promise.all([
      refreshWith(token1, TEST_UA),
      refreshWith(token1, TEST_UA),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(extractRefreshToken(second)).toBe(extractRefreshToken(first));

    const sessionInDb = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(sessionInDb).not.toBeNull();
  });
});
