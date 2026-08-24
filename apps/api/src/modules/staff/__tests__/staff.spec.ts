import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

// Mock the mailer to avoid making external HTTP calls
vi.mock('../../../mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Staff Management API Integration Tests', () => {
  let vendorPayload1: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNumber: string;
    shopName: string;
    panNumber: string;
    citizenshipNumber: string;
  };

  let vendorPayload2: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNumber: string;
    shopName: string;
    panNumber: string;
    citizenshipNumber: string;
  };

  let vendor1Cookie: string;
  let vendor2Cookie: string;
  let vendor1UserId: string;
  let vendor2UserId: string;
  const createdStaffIds: string[] = [];

  beforeEach(async () => {
    const getCookie = (res: { headers: Record<string, string | string[] | undefined> }): string => {
      const rawCookies = res.headers['set-cookie'];
      return Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';
    };

    vendorPayload1 = {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phoneNumber: `98${faker.string.numeric(8)}`,
      shopName: `Store 1 ${faker.company.name()}`,
      panNumber: faker.string.numeric(9),
      citizenshipNumber: `11-${faker.string.numeric(6)}`,
    };

    vendorPayload2 = {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phoneNumber: `98${faker.string.numeric(8)}`,
      shopName: `Store 2 ${faker.company.name()}`,
      panNumber: faker.string.numeric(9),
      citizenshipNumber: `22-${faker.string.numeric(6)}`,
    };

    // 1. Create and login VENDOR 1
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload1);
    const vendor1Record = await prisma.user.findFirst({
      where: { email: vendorPayload1.email.toLowerCase() },
    });
    vendor1UserId = vendor1Record!.id;
    await prisma.user.update({
      where: { id: vendor1UserId },
      data: { isEmailVerified: true },
    });
    const vendor1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: vendorPayload1.email, password: vendorPayload1.password });
    vendor1Cookie = getCookie(vendor1Login);

    // 2. Create and login VENDOR 2
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload2);
    const vendor2Record = await prisma.user.findFirst({
      where: { email: vendorPayload2.email.toLowerCase() },
    });
    vendor2UserId = vendor2Record!.id;
    await prisma.user.update({
      where: { id: vendor2UserId },
      data: { isEmailVerified: true },
    });
    const vendor2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: vendorPayload2.email, password: vendorPayload2.password });
    vendor2Cookie = getCookie(vendor2Login);
  });

  afterEach(async () => {
    if (createdStaffIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: createdStaffIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdStaffIds } } });
      createdStaffIds.length = 0;
    }
    if (vendor1UserId) {
      await prisma.session.deleteMany({ where: { userId: vendor1UserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: vendor1UserId } });
      await prisma.user.deleteMany({ where: { id: vendor1UserId } });
    }
    if (vendor2UserId) {
      await prisma.session.deleteMany({ where: { userId: vendor2UserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: vendor2UserId } });
      await prisma.user.deleteMany({ where: { id: vendor2UserId } });
    }
  });

  it('should allow VENDOR 1 to create staff linked to their own vendor profile', async () => {
    const staffEmail = faker.internet.email().toLowerCase();
    const res = await request(app).post('/api/v1/staff').set('Cookie', vendor1Cookie).send({
      name: 'Staff Member A',
      email: staffEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('STAFF');
    expect(res.body.data.vendorId).toBeDefined();

    const staffId = res.body.data.id;
    createdStaffIds.push(staffId);

    // Verify in database that staff links to Vendor 1's profile
    const dbStaff = await prisma.user.findUnique({
      where: { id: staffId },
      include: { vendor: true },
    });
    expect(dbStaff!.vendor!.shopName).toBe(vendorPayload1.shopName);
  });

  it('should allow VENDOR 1 to list only their own staff', async () => {
    const staffEmail = faker.internet.email().toLowerCase();
    // VENDOR 1 creates staff
    const createRes = await request(app).post('/api/v1/staff').set('Cookie', vendor1Cookie).send({
      name: 'Staff Member A',
      email: staffEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    createdStaffIds.push(createRes.body.data.id);

    // VENDOR 2 lists staff (should be empty)
    const list2 = await request(app).get('/api/v1/staff').set('Cookie', vendor2Cookie);

    expect(list2.status).toBe(200);
    expect(list2.body.data.length).toBe(0);

    // VENDOR 1 lists staff (should see 1 staff member)
    const list1 = await request(app).get('/api/v1/staff').set('Cookie', vendor1Cookie);

    expect(list1.status).toBe(200);
    expect(list1.body.data.length).toBe(1);
    expect(list1.body.data[0]?.email).toBe(staffEmail);
  });

  it('should prevent VENDOR 2 from deleting VENDOR 1 staff', async () => {
    const staffEmail = faker.internet.email().toLowerCase();
    // VENDOR 1 creates staff
    const createRes = await request(app).post('/api/v1/staff').set('Cookie', vendor1Cookie).send({
      name: 'Staff Member A',
      email: staffEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const targetStaffId = createRes.body.data.id;
    createdStaffIds.push(targetStaffId);

    // VENDOR 2 attempts delete
    const deleteRes = await request(app)
      .delete(`/api/v1/staff/${targetStaffId}`)
      .set('Cookie', vendor2Cookie);

    expect(deleteRes.status).toBe(403);
  });

  it('should allow STAFF sub-user and SUPERADMIN to retrieve staff list', async () => {
    const staffEmail = faker.internet.email().toLowerCase();
    // 1. Create a staff member under VENDOR 1 with staff:view permission
    const createStaffRes = await request(app)
      .post('/api/v1/staff')
      .set('Cookie', vendor1Cookie)
      .send({
        name: 'Staff Sub-User One',
        email: staffEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        permissions: ['staff:view'],
      });
    expect(createStaffRes.status).toBe(201);
    const subUserStaffId = createStaffRes.body.data.id;
    createdStaffIds.push(subUserStaffId);

    // Verify staff member's email so they can log in
    await prisma.user.update({
      where: { id: subUserStaffId },
      data: { isEmailVerified: true },
    });

    // Login as the STAFF sub-user
    const staffLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: staffEmail, password: 'Password123!' });
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
    const adminEmail = faker.internet.email().toLowerCase();
    const adminUser = await prisma.user.create({
      data: {
        name: 'Super Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPERADMIN',
        isEmailVerified: true,
      },
    });
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    const rawAdminCookies = adminLoginRes.headers['set-cookie'];
    const adminCookie = Array.isArray(rawAdminCookies)
      ? rawAdminCookies.join('; ')
      : rawAdminCookies || '';

    const adminListRes = await request(app).get('/api/v1/staff').set('Cookie', adminCookie);

    expect(adminListRes.status).toBe(200);
    expect(adminListRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Clean up admin user
    await prisma.session.deleteMany({ where: { userId: adminUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it('should allow VENDOR 1 to update permissions for their staff member', async () => {
    const staffEmail = faker.internet.email().toLowerCase();
    const createRes = await request(app)
      .post('/api/v1/staff')
      .set('Cookie', vendor1Cookie)
      .send({
        name: 'Staff Member B',
        email: staffEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        permissions: ['product:view'],
      });

    const targetStaffId = createRes.body.data.id;
    createdStaffIds.push(targetStaffId);

    const patchRes = await request(app)
      .patch(`/api/v1/staff/${targetStaffId}`)
      .set('Cookie', vendor1Cookie)
      .send({ permissions: ['product:view', 'finance:view'] });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.permissions).toEqual(['product:view', 'finance:view']);
  });
});
