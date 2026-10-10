import { describe, expect, it } from 'vitest';

import { createDeliverableZone } from '../../../../tests/support/delivery-zone';
import { deliveryCoverageRepository } from '../delivery-coverage.repository';

import prisma from '@/config/db.prisma';

/**
 * Geographic administrative districts in Nepal are static reference entities.
 * Active bootstrap/seeded districts retain permanent delivery coverage and
 * are never artificially invalidated by background sync timestamps.
 */
describe('Delivery Location Coverage Persistence', () => {
  it('reports coverage for an active deliverable zone', async () => {
    const { zoneId } = await createDeliverableZone();

    const result = await deliveryCoverageRepository.coverageForAddress({ logisticsZoneId: zoneId });

    expect(result.status).toBe('COVERED');
    expect(result.needsZoneSelection).toBe(false);
  });

  it('maintains coverage for seeded bootstrap districts regardless of sync timestamp age', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const city = await prisma.logisticsCity.create({
      data: {
        name: 'Persistent Bootstrap City',
        province: 'Bagmati',
        isValley: true,
        source: 'BOOTSTRAP',
        syncedAt: thirtyDaysAgo,
        freeDeliveryThreshold: 2500,
      },
      select: { id: true },
    });

    const zone = await prisma.logisticsZone.create({
      data: {
        cityId: city.id,
        externalId: 880099,
        name: 'Persistent Bootstrap Zone',
      },
      select: { id: true },
    });

    const result = await deliveryCoverageRepository.coverageForAddress({
      logisticsZoneId: zone.id,
    });

    expect(result.status).toBe('COVERED');
    expect(result.needsZoneSelection).toBe(false);
  });

  it('refuses coverage when no zone id is provided on the address', async () => {
    const result = await deliveryCoverageRepository.coverageForAddress({ logisticsZoneId: null });

    expect(result.status).toBe('UNVERIFIED');
    expect(result.needsZoneSelection).toBe(true);
  });

  it('marks inactive zones as uncovered', async () => {
    const city = await prisma.logisticsCity.create({
      data: {
        name: 'Inactive Test City',
        province: 'Gandaki',
        isValley: false,
        isActive: false,
        source: 'BOOTSTRAP',
        syncedAt: new Date(),
        freeDeliveryThreshold: 4000,
      },
      select: { id: true },
    });

    const zone = await prisma.logisticsZone.create({
      data: {
        cityId: city.id,
        externalId: 880098,
        name: 'Inactive Test Zone',
        isActive: false,
      },
      select: { id: true },
    });

    const result = await deliveryCoverageRepository.coverageForAddress({
      logisticsZoneId: zone.id,
    });

    expect(result.status).toBe('UNCOVERED');
  });
});
