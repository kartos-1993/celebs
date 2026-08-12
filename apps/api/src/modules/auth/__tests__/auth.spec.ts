import request from 'supertest';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import app from '@/app';
import prisma from '@/db';

// Mock the mailer to avoid making external HTTP calls
vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Authentication API Integration Tests', () => {
  const testUser = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully (Happy Path)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(res.status).toBe(201); // Wait, what is status? In app.ts it's HTTPSTATUS.CREATED. Oh, let's see. Wait, in auth.controller it was 201 (HTTPSTATUS.CREATED). Oh wait, HTTPSTATUS.CREATED is 201. Let's expect 201.
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.isEmailVerified).toBe(false);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should reject registration with invalid fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: '',
        email: 'invalid-email',
        password: '123',
        confirmPassword: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app).post('/api/v1/auth/register').send(testUser);

      // Duplicate registration
      const res = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject mismatched passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          confirmPassword: 'DifferentPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register user before testing login
      await request(app).post('/api/v1/auth/register').send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());

      // Check cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookiesArray = Array.isArray(cookies)
        ? cookies
        : typeof cookies === 'string'
          ? [cookies]
          : [];
      expect(cookiesArray.some((c: string) => c.includes('accessToken'))).toBe(true);
    });

    it('should reject login with incorrect credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    let verificationCode: string;

    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);

      // Find the generated verification code in the database
      const codeRecord = await prisma.verificationCode.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      verificationCode = codeRecord!.code;
    });

    it('should verify email successfully with valid code', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        code: verificationCode,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.isEmailVerified).toBe(true);

      // Verify DB state
      const dbUser = await prisma.user.findUnique({
        where: { email: testUser.email.toLowerCase() },
      });
      expect(dbUser!.isEmailVerified).toBe(true);
    });

    it('should reject verification with invalid code', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        code: 'invalid-verification-code-uuid',
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authCookie: string;

    beforeEach(async () => {
      // Register and login to get active session/cookies
      await request(app).post('/api/v1/auth/register').send(testUser);
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      const rawCookies = loginRes.headers['set-cookie'];
      authCookie = Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';
    });

    it('should logout successfully with authenticated session', async () => {
      const res = await request(app).post('/api/v1/auth/logout').set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Check cookies are cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookiesArray = Array.isArray(cookies)
        ? cookies
        : typeof cookies === 'string'
          ? [cookies]
          : [];
      expect(cookiesArray.some((c: string) => c.includes('accessToken=;'))).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
