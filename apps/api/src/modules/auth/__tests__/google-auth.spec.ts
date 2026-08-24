import { faker } from '@faker-js/faker';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '@/app';
import prisma from '@/config/db.prisma';

// Hoist mock functions so they are available inside vi.mock()
const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
  };
});

describe('Google Sign-In Cryptographic Verification & Auth Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authenticate and create user when valid Google idToken is provided', async () => {
    const email = faker.internet.email().toLowerCase();
    const name = faker.person.fullName();

    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email,
        name,
        email_verified: true,
        sub: 'google-uid-12345',
      }),
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'valid-signed-google-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    // Verify user is in DB and marked as email verified
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.isEmailVerified).toBe(true);

    // Verify session exists in DB
    const session = await prisma.session.findFirst({ where: { userId: dbUser?.id } });
    expect(session).not.toBeNull();

    // Clean up created user only
    await prisma.session.deleteMany({ where: { userId: dbUser!.id } });
    await prisma.user.delete({ where: { id: dbUser!.id } });
  });

  it('should reject Google sign-in when Google email is not verified', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'unverified@gmail.com',
        email_verified: false,
      }),
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'unverified-google-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject Google sign-in when idToken is expired or invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Token used too late'));

    const res = await request(app).post('/api/v1/auth/google').send({ idToken: 'expired-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject Google sign-in when idToken is omitted', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
