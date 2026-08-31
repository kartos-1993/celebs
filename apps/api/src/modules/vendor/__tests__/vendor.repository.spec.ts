import { faker } from '@faker-js/faker';
import { afterEach, describe, expect, it } from 'vitest';

import { vendorRepository } from '../vendor.repository';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('VendorRepository Integration Tests', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      const profile = await prisma.vendorProfile.findUnique({
        where: { userId: createdUserId },
      });
      if (profile) {
        await prisma.warehouse.deleteMany({ where: { vendorProfileId: profile.id } });
        await prisma.vendorProfile.delete({ where: { id: profile.id } });
      }
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should create vendor with profile transactionally and query uniqueness fields', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const shopName = faker.company.name() + ` ${Date.now()}`;
    const phoneNumber = `98${faker.string.numeric(8)}`;
    const panNumber = faker.string.numeric(9);
    const citizenshipNumber = `15-${faker.string.numeric(6)}`;

    const { user, vendorProfileId } = await vendorRepository.createVendorWithProfile(
      {
        name: 'Vendor Repo Tester',
        email,
        password: await hashValue('Password123!'),
        role: 'VENDOR',
      },
      {
        phoneNumber,
        shopName,
        shopDescription: 'Test shop description',
        panNumber,
        citizenshipNumber,
        status: 'PENDING',
      },
    );
    createdUserId = user.id;

    expect(user.id).toBeDefined();
    expect(vendorProfileId).toBeDefined();

    const byShop = await vendorRepository.findByShopName(shopName);
    expect(byShop?.id).toBe(vendorProfileId);

    const byPhone = await vendorRepository.findByPhoneNumber(phoneNumber);
    expect(byPhone?.id).toBe(vendorProfileId);

    const byPan = await vendorRepository.findByPanNumber(panNumber);
    expect(byPan?.id).toBe(vendorProfileId);

    const byCitizenship = await vendorRepository.findByCitizenshipNumber(citizenshipNumber);
    expect(byCitizenship?.id).toBe(vendorProfileId);

    const byUserId = await vendorRepository.findByUserId(user.id);
    expect(byUserId?.id).toBe(vendorProfileId);
  });

  it('should update vendor profile and upsert warehouse correctly', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const { user, vendorProfileId } = await vendorRepository.createVendorWithProfile(
      {
        name: 'Warehouse Tester',
        email,
        password: await hashValue('Password123!'),
        role: 'VENDOR',
      },
      {
        phoneNumber: `98${faker.string.numeric(8)}`,
        shopName: `Warehouse Shop ${Date.now()}`,
        panNumber: faker.string.numeric(9),
        citizenshipNumber: `16-${faker.string.numeric(6)}`,
        status: 'PENDING',
      },
    );
    createdUserId = user.id;

    const updated = await vendorRepository.updateProfile(user.id, {
      shopDescription: 'Updated description',
      onboardingStep: 2,
    });
    expect(updated.shopDescription).toBe('Updated description');
    expect(updated.onboardingStep).toBe(2);

    const warehouse = await vendorRepository.upsertWarehouse(vendorProfileId, {
      label: 'Main Warehouse',
      contactName: 'Warehouse Manager',
      contactPhone: '9800000000',
      addressLine1: 'Kathmandu 1',
      city: 'Kathmandu',
      district: 'Kathmandu',
      province: 'Bagmati',
      isBusinessAddress: true,
    });
    expect(warehouse.id).toBeDefined();
    expect(warehouse.label).toBe('Main Warehouse');
  });
});
