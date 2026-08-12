import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '@/app';
import prisma from '@/db';

// Mock the mailer to avoid making external HTTP calls
vi.mock('../../../mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Vendor Onboarding API Integration Tests', () => {
  const vendorPayload = {
    name: 'Test Vendor',
    email: 'test.vendor@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phoneNumber: '9841112223',
    shopName: 'Test Seller Store',
    panNumber: '999999999',
    citizenshipNumber: '99-88-77-66',
  };

  let authCookie: string;

  beforeEach(async () => {
    // Clean database before each test run
    await prisma.session.deleteMany({});
    await prisma.verificationCode.deleteMany({});
    await prisma.vendorProfile.deleteMany({});
    await prisma.user.deleteMany({});

    // Register and login to get active session/cookies
    await request(app).post('/api/v1/auth/vendor/register').send(vendorPayload);
    const codeRecord = await prisma.verificationCode.findFirst({});
    await request(app).post('/api/v1/auth/verify-email').send({ code: codeRecord!.code });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: vendorPayload.email,
      password: vendorPayload.password,
    });
    const rawCookies = loginRes.headers['set-cookie'];
    authCookie = Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';
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
