import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/db';

// Mock the mailer to avoid making external HTTP calls
vi.mock('../../../mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Staff Management API Integration Tests', () => {
  const vendorPayload1 = {
    name: 'Vendor Owner One',
    email: 'vendor1.test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phoneNumber: '9840000001',
    shopName: 'Vendor Shop One',
    panNumber: '111111111',
    citizenshipNumber: '11-11-11-11',
  };

  const vendorPayload2 = {
    name: 'Vendor Owner Two',
    email: 'vendor2.test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phoneNumber: '9840000002',
    shopName: 'Vendor Shop Two',
    panNumber: '222222222',
    citizenshipNumber: '22-22-22-22',
  };

  let vendor1Cookie: string;
  let vendor2Cookie: string;
  let staffId: string;

  beforeEach(async () => {
    const getCookie = (res: { headers: Record<string, string | string[] | undefined> }): string => {
      const rawCookies = res.headers['set-cookie'];
      return Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';
    };

    // 1. Create and login VENDOR 1
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload1);
    const vendor1Record = await prisma.user.findFirst({ where: { email: vendorPayload1.email } });
    await prisma.user.update({
      where: { id: vendor1Record!.id },
      data: { isEmailVerified: true },
    });
    const vendor1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: vendorPayload1.email, password: vendorPayload1.password });
    vendor1Cookie = getCookie(vendor1Login);

    // 2. Create and login VENDOR 2
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload2);
    const vendor2Record = await prisma.user.findFirst({ where: { email: vendorPayload2.email } });
    await prisma.user.update({
      where: { id: vendor2Record!.id },
      data: { isEmailVerified: true },
    });
    const vendor2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: vendorPayload2.email, password: vendorPayload2.password });
    vendor2Cookie = getCookie(vendor2Login);
  });

  it('should allow VENDOR 1 to create staff linked to their own vendor profile', async () => {
    const res = await request(app).post('/api/v1/staff').set('Cookie', vendor1Cookie).send({
      name: 'Staff Member A',
      email: 'staff.a@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('STAFF');
    expect(res.body.data.vendorId).toBeDefined();

    staffId = res.body.data.id;

    // Verify in database that staff links to Vendor 1's profile
    const dbStaff = await prisma.user.findUnique({
      where: { id: staffId },
      include: { vendor: true },
    });
    expect(dbStaff!.vendor!.shopName).toBe(vendorPayload1.shopName);
  });

  it('should allow VENDOR 1 to list only their own staff', async () => {
    // VENDOR 1 creates staff
    await request(app).post('/api/v1/staff').set('Cookie', vendor1Cookie).send({
      name: 'Staff Member A',
      email: 'staff.a@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    // VENDOR 2 lists staff (should be empty)
    const list2 = await request(app).get('/api/v1/staff').set('Cookie', vendor2Cookie);

    expect(list2.status).toBe(200);
    expect(list2.body.data.length).toBe(0);

    // VENDOR 1 lists staff (should see 1 staff member)
    const list1 = await request(app).get('/api/v1/staff').set('Cookie', vendor1Cookie);

    expect(list1.status).toBe(200);
    expect(list1.body.data.length).toBe(1);
    expect(list1.body.data[0].email).toBe('staff.a@example.com');
  });

  it('should prevent VENDOR 2 from deleting VENDOR 1 staff', async () => {
    // VENDOR 1 creates staff
    const createRes = await request(app).post('/api/v1/staff').set('Cookie', vendor1Cookie).send({
      name: 'Staff Member A',
      email: 'staff.a@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const targetStaffId = createRes.body.data.id;

    // VENDOR 2 attempts delete
    const deleteRes = await request(app)
      .delete(`/api/v1/staff/${targetStaffId}`)
      .set('Cookie', vendor2Cookie);

    expect(deleteRes.status).toBe(403);
  });

  it('should allow STAFF sub-user and SUPERADMIN to retrieve staff list', async () => {
    // 1. Create a staff member under VENDOR 1
    const createStaffRes = await request(app)
      .post('/api/v1/staff')
      .set('Cookie', vendor1Cookie)
      .send({
        name: 'Staff Sub-User One',
        email: 'subuser1@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    expect(createStaffRes.status).toBe(201);

    // Verify staff member's email so they can log in
    await prisma.user.update({
      where: { email: 'subuser1@example.com' },
      data: { isEmailVerified: true },
    });

    // Login as the STAFF sub-user
    const staffLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'subuser1@example.com', password: 'Password123!' });
    const rawStaffCookies = staffLoginRes.headers['set-cookie'];
    const staffCookie = Array.isArray(rawStaffCookies)
      ? rawStaffCookies.join('; ')
      : rawStaffCookies || '';

    // STAFF sub-user lists staff (should resolve vendor profile via user.vendorId)
    const staffListRes = await request(app).get('/api/v1/staff').set('Cookie', staffCookie);
    expect(staffListRes.status).toBe(200);
    expect(staffListRes.body.data.length).toBe(1);

    // 2. Superadmin user listing staff
    const hashedPassword = await hashValue('Password123!');
    const adminUser = await prisma.user.create({
      data: {
        name: 'Super Admin User',
        email: 'superadmin.stafftest@example.com',
        password: hashedPassword,
        role: 'SUPERADMIN',
        isEmailVerified: true,
      },
    });
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin.stafftest@example.com', password: 'Password123!' });
    const rawAdminCookies = adminLoginRes.headers['set-cookie'];
    const adminCookie = Array.isArray(rawAdminCookies)
      ? rawAdminCookies.join('; ')
      : rawAdminCookies || '';

    const adminListRes = await request(app).get('/api/v1/staff').set('Cookie', adminCookie);

    expect(adminListRes.status).toBe(200);
    expect(adminListRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Clean up admin user
    await prisma.user.delete({ where: { id: adminUser.id } });
  });
});
