import { describe, expect, it } from 'vitest';

import { createDeliverableZone } from '../../../../tests/support/delivery-zone';
import {
  deliveryCoverageRepository,
  LOCATION_MIRROR_STALE_MS,
} from '../delivery-coverage.repository';

import prisma from '@/config/db.prisma';

/**
 * The mirror is only allowed to assert that a zone is *still* served if it was
 * refreshed recently. Bootstrap rows are stamped with the seed time and never
 * refreshed, so a database running on reference data alone must eventually stop
 * claiming coverage rather than assert it forever.
 */
describe('delivery mirror freshness', () => {
  const eightDaysAgo = () =>
    new Date(Date.now() - (LOCATION_MIRROR_STALE_MS + 24 * 60 * 60 * 1000));

  it('still reports coverage while the mirror was refreshed inside the window', async () => {
    const { zoneId } = await createDeliverableZone();

    const result = await deliveryCoverageRepository.coverageForAddress({ logisticsZoneId: zoneId });

    expect(result.status).toBe('COVERED');
  });

  it('stops claiming coverage once the mirror has not been refreshed for seven days', async () => {
    const { zoneId } = await createDeliverableZone();

    await prisma.logisticsCity.updateMany({
      where: { zones: { some: { id: zoneId } } },
      data: { syncedAt: eightDaysAgo() },
    });

    const result = await deliveryCoverageRepository.coverageForAddress({ logisticsZoneId: zoneId });

    expect(result.status).toBe('UNVERIFIED');
    expect(result.needsZoneSelection).toBe(true);
  });

  // Bootstrap reference data is ours, not the courier's. It ages like anything
  // else, so it cannot keep vouching for a district indefinitely.
  it('stops claiming coverage for a district that was only ever seeded', async () => {
    // Built here rather than taken from the shared fixture, which is courier-synced
    // and therefore never stale. A bootstrapped city is the only kind of row this
    // staleness rule exists for, so the test has to make one.
    const city = await prisma.logisticsCity.create({
      data: {
        name: 'Stale Bootstrap City',
        province: 'Bagmati',
        isValley: true,
        source: 'BOOTSTRAP',
        syncedAt: eightDaysAgo(),
        freeDeliveryThreshold: 2500,
      },
      select: { id: true },
    });
    const zone = await prisma.logisticsZone.create({
      data: {
        cityId: city.id,
        externalId: 880001,
        name: 'Stale Bootstrap Zone',
      },
      select: { id: true },
    });

    const result = await deliveryCoverageRepository.coverageForAddress({
      logisticsZoneId: zone.id,
    });

    expect(result.status).toBe('UNVERIFIED');
  });

  it('does not claim coverage for a database with no location data at all', async () => {
    const result = await deliveryCoverageRepository.coverageForAddress({ logisticsZoneId: null });

    expect(result.status).toBe('UNVERIFIED');
  });
});
