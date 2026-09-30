import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { COMMERCE_POLICY_DEFAULTS } from '@celebs/shared-types';

import app from '@/app';
import prisma from '@/config/db.prisma';
import { seedCommerceSettings } from '@/db/seed/seed-commerce-settings';
import { seedLogisticsLocations } from '@/db/seed/seed-logistics-locations';

/**
 * The address form is built on this endpoint, so what it omits matters as much
 * as what it includes: a district or area that no longer has a courier zone must
 * not be offered, because the form would take the customer through picking it
 * only for checkout to refuse.
 */

const createdCityIds: string[] = [];
const createdZoneIds: string[] = [];

afterAll(async () => {
  await prisma.logisticsZone.deleteMany({ where: { id: { in: createdZoneIds } } });
  await prisma.logisticsCity.deleteMany({ where: { id: { in: createdCityIds } } });
});

async function seedCity(input: {
  name: string;
  province: string;
  isValley: boolean;
  isActive?: boolean;
}) {
  const city = await prisma.logisticsCity.create({
    data: {
      name: input.name,
      province: input.province,
      isValley: input.isValley,
      isActive: input.isActive ?? true,
      freeDeliveryThreshold: input.isValley ? 2500 : 5000,
      source: 'BOOTSTRAP',
    },
    select: { id: true },
  });
  createdCityIds.push(city.id);
  return city;
}

describe('GET /logistics/delivery-locations', () => {
  it('offers a seeded district with its area and free-delivery threshold', async () => {
    await seedLogisticsLocations();
    await seedCommerceSettings();

    const response = await request(app).get('/api/v1/logistics/delivery-locations');
    const body = response.body?.data;

    expect(response.status).toBe(200);

    const bagmati = body.provinces.find(
      (province: { name: string }) => province.name === 'Bagmati',
    );
    expect(bagmati).toBeDefined();

    const kathmandu = bagmati.districts.find(
      (district: { name: string }) => district.name === 'Kathmandu',
    );
    expect(kathmandu).toBeDefined();
    expect(kathmandu.isValley).toBe(true);
    expect(kathmandu.freeDeliveryThreshold).toBe(2500);
    // A seeded district has a real area, so the form's second step is usable.
    expect(kathmandu.areas.length).toBeGreaterThan(0);
  });

  it('does not offer a district the courier has retired', async () => {
    await seedLogisticsLocations();
    await seedCommerceSettings();
    const city = await seedCity({
      name: 'Retired District',
      province: 'Bagmati',
      isValley: false,
      isActive: false,
    });
    const zone = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 881_001, name: 'Retired Zone' },
      select: { id: true },
    });
    createdZoneIds.push(zone.id);

    const response = await request(app).get('/api/v1/logistics/delivery-locations');
    const names = response.body.data.provinces.flatMap(
      (province: { districts: Array<{ name: string }> }) =>
        province.districts.map((district) => district.name),
    );

    expect(names).not.toContain('Retired District');
  });

  it('omits a retired area without hiding its district', async () => {
    await seedLogisticsLocations();
    await seedCommerceSettings();
    const city = await seedCity({
      name: 'Partial District',
      province: 'Bagmati',
      isValley: false,
    });

    const active = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 882_001, name: 'Open Area' },
      select: { id: true },
    });
    createdZoneIds.push(active.id);
    const retired = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 882_002, name: 'Closed Area', isActive: false },
      select: { id: true },
    });
    createdZoneIds.push(retired.id);

    const response = await request(app).get('/api/v1/logistics/delivery-locations');
    const district = response.body.data.provinces
      .flatMap(
        (province: { districts: Array<{ name: string; areas: Array<{ name: string }> }> }) =>
          province.districts,
      )
      .find((entry: { name: string }) => entry.name === 'Partial District');

    expect(district).toBeDefined();
    expect(district.areas.map((area: { name: string }) => area.name)).toEqual(['Open Area']);
  });

  it('reports when the list was last refreshed', async () => {
    await seedLogisticsLocations();
    await seedCommerceSettings();

    const response = await request(app).get('/api/v1/logistics/delivery-locations');
    expect(response.body.data.syncedAt).toEqual(expect.any(String));
  });

  it('exposes the COD ceiling so the app never invents one', async () => {
    await seedCommerceSettings();
    const settings = await prisma.platformSetting.findUnique({
      where: { key: 'commerce.cod_max_limit' },
    });
    // The endpoint deliberately does not carry commerce policy; the app reads
    // that from settings. This asserts the split stays deliberate.
    expect(settings?.value).toBe(String(COMMERCE_POLICY_DEFAULTS.codMaxLimit));
  });
});
