import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '@/app';
import prisma from '@/config/db.prisma';

// Mock the mailer to avoid making external HTTP calls
vi.mock('../../../mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Vendor Onboarding API Integration Tests', () => {
  let vendorPayload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNumber: string;
    shopName: string;
    panNumber: string;
    citizenshipNumber: string;
  };

  let authCookie: string;
  let currentUserId: string | null = null;

  beforeEach(async () => {
    const email = faker.internet.email().toLowerCase();
    vendorPayload = {
      name: faker.person.fullName(),
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phoneNumber: `98${faker.string.numeric(8)}`,
      shopName: faker.company.name(),
      panNumber: faker.string.numeric(9),
      citizenshipNumber: `12-${faker.string.numeric(6)}`,
    };

    // Register and login to get active session/cookies
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
    const user = await prisma.user.findUnique({
      where: { email: vendorPayload.email.toLowerCase() },
    });
    currentUserId = user!.id;

    const codeRecord = await prisma.verificationCode.findFirst({
      where: { userId: currentUserId },
      orderBy: { createdAt: 'desc' },
    });
    await request(app).post('/api/v1/auth/verify-email').send({ code: codeRecord!.code });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: vendorPayload.email,
      password: vendorPayload.password,
    });
    const rawCookies = loginRes.headers['set-cookie'];
    authCookie = Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';
  });

  afterEach(async () => {
    if (currentUserId) {
      await prisma.session.deleteMany({ where: { userId: currentUserId } });
      await prisma.verificationCode.deleteMany({ where: { userId: currentUserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: currentUserId } });
      await prisma.user.deleteMany({ where: { id: currentUserId } });
      currentUserId = null;
    }
  });

  it('should return onboarding status', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/onboarding-status')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('onboardingStep');
  });

  it('should update profile info and advance onboardingStep', async () => {
    const res = await request(app).put('/api/v1/vendor/profile').set('Cookie', authCookie).send({
      shopDescription: 'New Description',
      phoneNumber: '9849999999',
      storeLogo: 'http://cloudinary.com/logo.png',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shopDescription).toBe('New Description');

    const statusRes = await request(app)
      .get('/api/v1/vendor/onboarding-status')
      .set('Cookie', authCookie);
    expect(statusRes.body.data.onboardingStep).toBe(2);
  });

  it('should add warehouse details and advance onboardingStep', async () => {
    // Set starting step in DB
    const user = await prisma.user.findFirst({
      where: { email: vendorPayload.email.toLowerCase() },
    });
    await prisma.vendorProfile.update({
      where: { userId: user!.id },
      data: { onboardingStep: 2 },
    });

    const res = await request(app).put('/api/v1/vendor/warehouse').set('Cookie', authCookie).send({
      label: 'Primary Warehouse',
      contactName: 'Ram Shrestha',
      contactPhone: '9840001112',
      addressLine1: 'Maitighar',
      city: 'Kathmandu',
      district: 'Kathmandu',
      province: 'Bagmati',
      postalCode: '44600',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const statusRes = await request(app)
      .get('/api/v1/vendor/onboarding-status')
      .set('Cookie', authCookie);
    expect(statusRes.body.data.onboardingStep).toBe(3);
  });

  it('should upload documents and advance onboardingStep', async () => {
    // Set starting step in DB
    const user = await prisma.user.findFirst({
      where: { email: vendorPayload.email.toLowerCase() },
    });
    await prisma.vendorProfile.update({
      where: { userId: user!.id },
      data: { onboardingStep: 3 },
    });

    const res = await request(app).put('/api/v1/vendor/documents').set('Cookie', authCookie).send({
      panDocumentUrl: 'http://cloudinary.com/pan.png',
      citizenshipDocumentUrl: 'http://cloudinary.com/citizen.png',
      vatDocumentUrl: 'http://cloudinary.com/vat.png',
      businessRegDocumentUrl: 'http://cloudinary.com/bizreg.png',
      ownerPhotoUrl: 'http://cloudinary.com/photo.png',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const statusRes = await request(app)
      .get('/api/v1/vendor/onboarding-status')
      .set('Cookie', authCookie);
    expect(statusRes.body.data.onboardingStep).toBe(4);
  });

  it('should update business info and advance onboardingStep', async () => {
    // Set starting step in DB
    const user = await prisma.user.findFirst({
      where: { email: vendorPayload.email.toLowerCase() },
    });
    await prisma.vendorProfile.update({
      where: { userId: user!.id },
      data: { onboardingStep: 4 },
    });

    const res = await request(app)
      .put('/api/v1/vendor/business-info')
      .set('Cookie', authCookie)
      .send({
        businessName: 'Ram Store Pvt Ltd',
        businessRegNumber: '123456/079/080',
        businessPhoneNumber: '9840009999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const statusRes = await request(app)
      .get('/api/v1/vendor/onboarding-status')
      .set('Cookie', authCookie);
    expect(statusRes.body.data.onboardingStep).toBe(5);
  });

  it('should submit for review and update profile status', async () => {
    const user = await prisma.user.findFirst({
      where: { email: vendorPayload.email.toLowerCase() },
    });
    await prisma.vendorProfile.update({
      where: { userId: user!.id },
      data: { onboardingStep: 5 },
    });

    const res = await request(app)
      .post('/api/v1/vendor/submit-for-review')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UNDER_REVIEW');
  });
});
