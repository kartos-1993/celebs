import request from 'supertest';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import app from '@/app';
import prisma from '@/db';

// Mock the mailer to avoid making external HTTP calls
vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Admin/SuperAdmin API Integration Tests', () => {
  const superadminPayload = {
    name: 'Super Admin',
    email: 'superadmin.test@example.com',
    password: 'Password123!',
    setupSecret: 'celebs-superadmin-secret-2026',
  };

  const adminPayload = {
    name: 'Admin User',
    email: 'admin.test@example.com',
    password: 'Password123!',
  };

  const vendorPayload = {
    name: 'Vendor User',
    email: 'vendor.test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phoneNumber: '9840001111',
    shopName: 'Test shop',
    panNumber: '111111111',
    citizenshipNumber: '11-22-33-44',
  };

  let superadminCookie: string;
  let adminCookie: string;
  let vendorCookie: string;
  let vendorId: string;

  beforeEach(async () => {
    const getCookie = (res: { headers: Record<string, string | string[]> }): string => {
      const rawCookies = res.headers['set-cookie'];
      return Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';
    };

    // 1. Create and login SUPERADMIN
    await request(app).post('/api/v1/auth/setup-superadmin').send(superadminPayload);
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: superadminPayload.email, password: superadminPayload.password });
    superadminCookie = getCookie(saLogin);

    // 2. Create and login ADMIN (Promoted via DB update)
    await request(app).post('/api/v1/auth/register').send({
      name: adminPayload.name,
      email: adminPayload.email,
      password: adminPayload.password,
      confirmPassword: adminPayload.password,
    });
    const adminUser = await prisma.user.findFirst({ where: { email: adminPayload.email } });
    await prisma.user.update({
      where: { id: adminUser!.id },
      data: { role: 'ADMIN', isEmailVerified: true },
    });
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminPayload.email, password: adminPayload.password });
    adminCookie = getCookie(adminLogin);

    // 3. Create and login VENDOR
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
    const vendorRecord = await prisma.user.findFirst({ where: { email: vendorPayload.email } });
    await prisma.user.update({
      where: { id: vendorRecord!.id },
      data: { isEmailVerified: true },
    });
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: vendorRecord!.id },
    });
    vendorId = vendorProfile!.id;

    const vendorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: vendorPayload.email, password: vendorPayload.password });
    vendorCookie = getCookie(vendorLogin);
  });

  describe('Vendor Approval Management (ADMIN & SUPERADMIN)', () => {
    it('should deny VENDOR access to list vendors', async () => {
      const res = await request(app).get('/api/v1/admin/vendors').set('Cookie', vendorCookie);

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN to list vendors', async () => {
      const res = await request(app).get('/api/v1/admin/vendors').set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should allow ADMIN to retrieve vendor details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/vendors/${vendorId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.shopName).toBe(vendorPayload.shopName);
    });

    it('should allow ADMIN to approve vendor profile', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/vendors/${vendorId}/approve`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('should allow ADMIN to reject vendor profile with a reason', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/vendors/${vendorId}/reject`)
        .set('Cookie', adminCookie)
        .send({ reason: 'Documents are blurred' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REJECTED');
    });
  });

  describe('User Management (SUPERADMIN only)', () => {
    it('should deny ADMIN access to create users', async () => {
      const res = await request(app).post('/api/v1/admin/users').set('Cookie', adminCookie).send({
        name: 'Staff user',
        email: 'staff.created@example.com',
        password: 'Password123!',
        role: 'STAFF',
      });

      expect(res.status).toBe(403);
    });

    it('should allow SUPERADMIN to list all users', async () => {
      const res = await request(app).get('/api/v1/admin/users').set('Cookie', superadminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow SUPERADMIN to create a new user account', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Cookie', superadminCookie)
        .send({
          name: 'New Moderator',
          email: 'mod@celebs.com',
          password: 'Password123!',
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('ADMIN');
    });
  });
});
