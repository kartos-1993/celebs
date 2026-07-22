import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/db';
import { Role } from '@/generated/prisma';

// Mock the mailer to avoid making external HTTP calls
vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('RBAC & Vendor Onboarding Integration Tests', () => {
  const vendorPayload = {
    name: 'Sabina Khadka',
    email: 'sabina.khadka@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phoneNumber: '9841234567',
    shopName: 'Sabina Boutique',
    shopDescription: 'Trendy clothes and accessories',
    panNumber: '987654321',
    citizenshipNumber: '12-34-56-7890',
  };

  const customerPayload = {
    name: 'Ram Shooper',
    email: 'ram.shooper@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeEach(async () => {
    // Clear databases or records created in tests to keep runs deterministic
    await prisma.session.deleteMany({});
    await prisma.vendorProfile.deleteMany({});
    await prisma.verificationCode.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('Vendor Registration & Statuses', () => {
    it('should register a vendor with PENDING status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/vendor/register')
        .send(vendorPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('VENDOR');

      // Verify VendorProfile database state
      const user = await prisma.user.findUnique({
        where: { email: vendorPayload.email.toLowerCase() },
        include: { vendorProfile: true },
      });
      expect(user).not.toBeNull();
      expect(user!.vendorProfile).not.toBeNull();
      expect(user!.vendorProfile!.shopName).toBe(vendorPayload.shopName);
      expect(user!.vendorProfile!.status).toBe('PENDING');
    });

    it('should allow login for PENDING vendors', async () => {
      // Register
      await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
      
      // Verify email
      const codeRecord = await prisma.verificationCode.findFirst({});
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ code: codeRecord!.code });

      // Login
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: vendorPayload.email,
          password: vendorPayload.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('VENDOR');
      expect(res.body.data.user.vendorProfile.status).toBe('PENDING');
    });

    it('should deny login for SUSPENDED vendors', async () => {
      // Register and verify email
      await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
      const codeRecord = await prisma.verificationCode.findFirst({});
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ code: codeRecord!.code });

      // Suspend vendor
      const user = await prisma.user.findFirst({
        where: { email: vendorPayload.email.toLowerCase() },
      });
      await prisma.vendorProfile.update({
        where: { userId: user!.id },
        data: { status: 'SUSPENDED' },
      });

      // Login
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: vendorPayload.email,
          password: vendorPayload.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should invalidate active JWT requests if vendor is suspended afterwards', async () => {
      // Register, verify, and login
      await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
      const codeRecord = await prisma.verificationCode.findFirst({});
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ code: codeRecord!.code });

      const authCookie = verifyRes.headers['set-cookie'];

      // Suspend vendor in database
      const user = await prisma.user.findFirst({
        where: { email: vendorPayload.email.toLowerCase() },
      });
      await prisma.vendorProfile.update({
        where: { userId: user!.id },
        data: { status: 'SUSPENDED' },
      });

      // Attempt authorized request
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', authCookie);

      expect(res.status).toBe(401); // Unauthorized/Forbidden access
    });
  });

  describe('RBAC Route Restrictions', () => {
    it('should deny CUSTOMER access to manage categories (403 Forbidden)', async () => {
      // Register customer and verify
      await request(app).post('/api/v1/auth/register').send(customerPayload);
      const codeRecord = await prisma.verificationCode.findFirst({});
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ code: codeRecord!.code });

      const authCookie = verifyRes.headers['set-cookie'];

      // Customer attempts to create a category
      const res = await request(app)
        .post('/api/v1/category')
        .set('Cookie', authCookie)
        .send({ name: 'Electronics' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should deny VENDOR access to manage categories (403 Forbidden)', async () => {
      // Register vendor and verify
      await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
      const codeRecord = await prisma.verificationCode.findFirst({});
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ code: codeRecord!.code });

      const authCookie = verifyRes.headers['set-cookie'];

      // Vendor attempts to create a category
      const res = await request(app)
        .post('/api/v1/category')
        .set('Cookie', authCookie)
        .send({ name: 'Furniture' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN access to manage categories (201 or normal flow)', async () => {
      // Register, verify, and promote to ADMIN
      await request(app).post('/api/v1/auth/register').send(customerPayload);
      const codeRecord = await prisma.verificationCode.findFirst({});
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ code: codeRecord!.code });

      const authCookie = verifyRes.headers['set-cookie'];

      const user = await prisma.user.findFirst({
        where: { email: customerPayload.email.toLowerCase() },
      });
      await prisma.user.update({
        where: { id: user!.id },
        data: { role: Role.ADMIN },
      });

      // Admin attempts to create a category (expecting 400 validation error instead of 403 Forbidden, since body is empty/invalid)
      const res = await request(app)
        .post('/api/v1/category')
        .set('Cookie', authCookie)
        .send({});

      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });
});
