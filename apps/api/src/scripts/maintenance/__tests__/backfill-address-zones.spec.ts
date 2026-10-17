import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backfillAddressZones } from '../backfill-address-zones';

import prisma from '@/config/db.prisma';

/**
 * Addresses saved before delivery zones existed have no zone, so checkout
 * refuses them. The bootstrap seed created exactly one zone per district, so an
 * address whose saved province and district name a seeded district exactly can
 * be pointed at that zone instead of making the customer re-pick.
 *
 * Matching is deliberately exact. A wrong zone is a paid order nobody can
 * deliver, and the whole reason the free-text district box is gone is that
 * "kathmandu" and "Kathmandu " cannot be resolved. Anything that does not match
 * cleanly is left alone for the customer to re-select.
 */
describe('backfillAddressZones', () => {
  const districtZone = '11111111-1111-4111-8111-111111111111';
  const otherZone = '22222222-2222-4222-8222-222222222222';

  const city = (name: string, province: string, zones: Array<{ id: string }>) => ({
    name,
    province,
    zones,
  });

  let findManyAddress: ReturnType<typeof vi.fn>;
  let findManyCity: ReturnType<typeof vi.fn>;
  let updateMany: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    findManyAddress = vi.fn();
    findManyCity = vi.fn();
    updateMany = vi.fn().mockResolvedValue({ count: 1 });

    vi.spyOn(prisma.address, 'findMany').mockImplementation(findManyAddress as never);
    vi.spyOn(prisma.logisticsCity, 'findMany').mockImplementation(findManyCity as never);
    vi.spyOn(prisma.address, 'updateMany').mockImplementation(updateMany as never);
  });

  it('points an address at the zone for its district', async () => {
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([{ addressId: 'addr-1', zoneId: districtZone }]);
  });

  it('leaves an address alone when the district is not one we deliver to', async () => {
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Mustafar', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual(['addr-1']);
  });

  it('requires the province to match too, since district names repeat', async () => {
    // "Gorkha" is a district in more than one province. Matching on district
    // alone would send a Gorkha address to the wrong courier zone.
    findManyAddress.mockResolvedValue([
      { id: 'addr-gorkha-bagmati', province: 'Bagmati', district: 'Gorkha', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([
      city('Gorkha', 'Bagmati', [{ id: districtZone }]),
      city('Gorkha', 'Gandaki', [{ id: otherZone }]),
    ]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([{ addressId: 'addr-gorkha-bagmati', zoneId: districtZone }]);
  });

  it('ignores trailing whitespace, which is a typing artifact rather than a different place', async () => {
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: ' Bagmati ', district: 'Kathmandu ', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([{ addressId: 'addr-1', zoneId: districtZone }]);
  });

  it('does not guess at a different spelling or case', async () => {
    // Rescuing these needs the fuzzy matching that produced undeliverable
    // orders, so they stay empty and the customer is asked to re-pick.
    findManyAddress.mockResolvedValue([
      { id: 'lower', province: 'Bagmati', district: 'kathmandu', logisticsZoneId: null },
      { id: 'longer', province: 'Bagmati', district: 'Kathmandu Valley', logisticsZoneId: null },
      { id: 'typo', province: 'Bagmati', district: 'Kathamandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([]);
    expect(result.unmatched.sort()).toEqual(['longer', 'lower', 'typo']);
  });

  it('only considers addresses that do not have a zone yet', async () => {
    findManyAddress.mockResolvedValue([]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    await backfillAddressZones({ apply: false });

    expect(findManyAddress).toHaveBeenCalledWith(
      expect.objectContaining({ where: { logisticsZoneId: null } }),
    );
  });

  it('guards every write on the zone still being empty', async () => {
    // A customer can save a new address while this runs. The write is filtered
    // on the zone still being null so their fresh pick is never overwritten with
    // the district-level fallback.
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    await backfillAddressZones({ apply: true });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['addr-1'] }, logisticsZoneId: null },
        data: { logisticsZoneId: districtZone },
      }),
    );
  });

  it('skips a district that has no zone yet, rather than inventing one', async () => {
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [])]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual(['addr-1']);
  });

  it('does not write anything when apply is false', async () => {
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([city('Kathmandu', 'Bagmati', [{ id: districtZone }])]);

    await backfillAddressZones({ apply: false });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('writes one statement per zone rather than one per address', async () => {
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
      { id: 'addr-2', province: 'Bagmati', district: 'Lalitpur', logisticsZoneId: null },
      { id: 'addr-3', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([
      city('Kathmandu', 'Bagmati', [{ id: districtZone }]),
      city('Lalitpur', 'Bagmati', [{ id: otherZone }]),
    ]);

    await backfillAddressZones({ apply: true });

    // Three addresses, two districts: two statements, not three round trips.
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['addr-1', 'addr-3'] }, logisticsZoneId: null },
      data: { logisticsZoneId: districtZone },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['addr-2'] }, logisticsZoneId: null },
      data: { logisticsZoneId: otherZone },
    });
  });

  it('does nothing at all when the location table is empty', async () => {
    // Running this before the bootstrap seed would otherwise mark every address
    // unmatched and report it as a problem.
    findManyAddress.mockResolvedValue([
      { id: 'addr-1', province: 'Bagmati', district: 'Kathmandu', logisticsZoneId: null },
    ]);
    findManyCity.mockResolvedValue([]);

    const result = await backfillAddressZones({ apply: false });

    expect(result.matched).toEqual([]);
    expect(result.skipped).toBe(true);
  });
});
