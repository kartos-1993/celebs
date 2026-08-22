import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
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

describe('Account Linking & OAuth Provider Conflict Suite', () => {
  let createdUserId: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should auto-link Google sign-in to existing email/password account and upgrade email verification', async () => {
    const rawPassword = 'Password123!';
    const email = faker.internet.exampleEmail().toLowerCase();
    const name = faker.person.fullName();

    // Step 1: User registers with email & password first (not yet verified)
    const existingUser = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashValue(rawPassword),
        isEmailVerified: false,
      },
    });
    createdUserId = existingUser.id;

    // Step 2: Later, user clicks "Sign in with Google" with the same email
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email,
        name,
        email_verified: true,
        sub: 'google-sub-998877',
      }),
    });

    const googleRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'valid-google-id-token' });

    expect(googleRes.status).toBe(200);
    expect(googleRes.body.success).toBe(true);
    expect(googleRes.body.data.user.id).toBe(existingUser.id);
    expect(googleRes.body.data.user.email).toBe(email);

    // Verify existing user's isEmailVerified was upgraded to true
    const updatedUser = await prisma.user.findUnique({ where: { id: existingUser.id } });
    expect(updatedUser?.isEmailVerified).toBe(true);
  });

  it('should block duplicate standard registration when account was originally created via Google', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const name = faker.person.fullName();

    // Step 1: User created initially via Google
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email,
        name,
        email_verified: true,
        sub: 'google-sub-112233',
      }),
    });

    const googleRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'initial-google-token' });

    expect(googleRes.status).toBe(200);
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).not.toBeNull();
    createdUserId = dbUser!.id;

    // Step 2: User tries standard register form with the same email
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Duplicate Attempt',
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    expect(regRes.status).toBe(400);
    expect(regRes.body.success).toBe(false);
  });

  it('should allow authenticated API calls using tokens issued from Google sign-in', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const name = faker.person.fullName();

    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email,
        name,
        email_verified: true,
        sub: 'google-sub-445566',
      }),
    });

    const googleRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'valid-token' });

    expect(googleRes.status).toBe(200);
    const accessToken = googleRes.body.data.accessToken;

    const dbUser = await prisma.user.findUnique({ where: { email } });
    createdUserId = dbUser!.id;

    // Access protected session endpoint using Google-issued bearer token
    const sessionRes = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.data.user.email).toBe(email);
  });
});
