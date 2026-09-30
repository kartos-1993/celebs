import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { authedMutation } from '../../../../tests/support/csrf-origin';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';

/**
 * The rate card decides what every customer is charged for delivery.
 *
 * Two things are pinned here. A vendor must not be able to touch it, because
 * these numbers decide the order total for the whole platform. And the API has to
 * refuse a band that overlaps one already on the card, because two bands claiming
 * the same weight silently price it at whichever one happens to be cheaper.
 */

const SUPERADMIN_EMAIL = 'ratecard-boss@celebs.com.np';
const VENDOR_EMAIL = 'ratecard-vendor@celebs.com.np';

describe('Delivery rate card admin API', () => {
  let superadminToken: string;
  let vendorToken: string;
  let cityId: string;

  const token = async (email: string, role: 'SUPERADMIN' | 'VENDOR') => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        name: 'Rate Card Tester',
        email,
        password: await hashValue('password123'),
        role,
        isEmailVerified: true,
      },
    });
    const session = await prisma.session.create({ data: { userId: user.id, userAgent: 'test' } });

    return `accessToken=${jwt.sign({ userId: user.id, sessionId: session.id }, config.JWT.SECRET, {
      audience: 'user',
    })}`;
  };

  beforeEach(async () => {
    superadminToken = await token(SUPERADMIN_EMAIL, 'SUPERADMIN');
    vendorToken = await token(VENDOR_EMAIL, 'VENDOR');

    cityId = randomUUID();
    await prisma.logisticsCity.create({
      data: {
        id: cityId,
        name: 'Rate Card City',
        province: 'Bagmati',
        isValley: true,
        freeDeliveryThreshold: 2500,
        source: 'BOOTSTRAP',
      },
    });
  });

  describe('permissions', () => {
    it('refuses an unauthenticated read', async () => {
      const response = await request(app).get('/api/v1/logistics/shipping-rates');

      expect(response.status).toBe(401);
    });

    it('refuses a vendor', async () => {
      const response = await request(app)
        .get('/api/v1/logistics/shipping-rates')
        .set('Cookie', vendorToken);

      expect(response.status).toBe(403);
    });

    it('allows a superadmin', async () => {
      const response = await request(app)
        .get('/api/v1/logistics/shipping-rates')
        .set('Cookie', superadminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('rate bands', () => {
    it('creates, lists and deletes a band', async () => {
      const created = await authedMutation(
        request(app).post('/api/v1/logistics/shipping-rates'),
        superadminToken,
      ).send({ cityId: null, minWeightKg: 0, maxWeightKg: 1, fee: 80, codFee: 0 });

      expect(created.status).toBe(201);
      expect(created.body.success).toBe(true);

      const listed = await request(app)
        .get('/api/v1/logistics/shipping-rates')
        .set('Cookie', superadminToken);

      expect(
        listed.body.data.some((rate: { id: string }) => rate.id === created.body.data.id),
      ).toBe(true);

      const removed = await authedMutation(
        request(app).delete(`/api/v1/logistics/shipping-rates/${created.body.data.id}`),
        superadminToken,
      );

      expect(removed.status).toBe(200);
    });

    it('refuses a band that overlaps one already on the card', async () => {
      await prisma.shippingRate.create({
        data: {
          cityId: null,
          minWeightKg: 0,
          maxWeightKg: 2,
          fee: 80,
          codFee: 0,
        },
      });

      const response = await authedMutation(
        request(app).post('/api/v1/logistics/shipping-rates'),
        superadminToken,
      ).send({ cityId: null, minWeightKg: 1, maxWeightKg: 3, fee: 120, codFee: 0 });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/overlap/i);
    });

    it('allows a band that starts exactly where another ends', async () => {
      await prisma.shippingRate.create({
        data: { cityId: null, minWeightKg: 0, maxWeightKg: 1, fee: 80, codFee: 0 },
      });

      const response = await authedMutation(
        request(app).post('/api/v1/logistics/shipping-rates'),
        superadminToken,
      ).send({ cityId: null, minWeightKg: 1, maxWeightKg: 5, fee: 120, codFee: 0 });

      expect(response.status).toBe(201);
    });

    it('allows overlapping bands in different cities', async () => {
      // The same weight legitimately costs different amounts in different cities.
      await prisma.shippingRate.create({
        data: {
          cityId,
          minWeightKg: 0,
          maxWeightKg: 2,
          fee: 80,
          codFee: 0,
        },
      });

      const response = await authedMutation(
        request(app).post('/api/v1/logistics/shipping-rates'),
        superadminToken,
      ).send({ cityId: null, minWeightKg: 0, maxWeightKg: 2, fee: 120, codFee: 0 });

      expect(response.status).toBe(201);
    });

    it('rejects a band with no width instead of storing a band that never matches', async () => {
      const response = await authedMutation(
        request(app).post('/api/v1/logistics/shipping-rates'),
        superadminToken,
      ).send({ cityId: null, minWeightKg: 2, maxWeightKg: 2, fee: 80, codFee: 0 });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('updates a fee', async () => {
      const rate = await prisma.shippingRate.create({
        data: { cityId: null, minWeightKg: 0, maxWeightKg: 1, fee: 80, codFee: 0 },
      });

      const response = await authedMutation(
        request(app).patch(`/api/v1/logistics/shipping-rates/${rate.id}`),
        superadminToken,
      ).send({ fee: 95 });

      expect(response.status).toBe(200);

      const reloaded = await prisma.shippingRate.findUniqueOrThrow({ where: { id: rate.id } });
      expect(reloaded.fee.toNumber()).toBe(95);
    });

    it('reports a band that does not exist', async () => {
      const response = await authedMutation(
        request(app).patch('/api/v1/logistics/shipping-rates/00000000-0000-4000-8000-000000000000'),
        superadminToken,
      ).send({ fee: 95 });

      expect(response.status).toBe(404);
    });
  });

  describe('city thresholds', () => {
    it('updates a free delivery threshold', async () => {
      const response = await authedMutation(
        request(app).patch(`/api/v1/logistics/delivery-cities/${cityId}`),
        superadminToken,
      ).send({ freeDeliveryThreshold: 4000 });

      expect(response.status).toBe(200);

      const reloaded = await prisma.logisticsCity.findUniqueOrThrow({ where: { id: cityId } });
      expect(reloaded.freeDeliveryThreshold).toBe(4000);
    });

    it('refuses a threshold low enough to make every order free', async () => {
      const response = await authedMutation(
        request(app).patch(`/api/v1/logistics/delivery-cities/${cityId}`),
        superadminToken,
      ).send({ freeDeliveryThreshold: 1 });

      expect(response.status).toBeGreaterThanOrEqual(400);

      const reloaded = await prisma.logisticsCity.findUniqueOrThrow({ where: { id: cityId } });
      expect(reloaded.freeDeliveryThreshold).toBe(2500);
    });

    it('refuses a vendor', async () => {
      const response = await authedMutation(
        request(app).patch(`/api/v1/logistics/delivery-cities/${cityId}`),
        vendorToken,
      ).send({ freeDeliveryThreshold: 4000 });

      expect(response.status).toBe(403);
    });
  });
});
