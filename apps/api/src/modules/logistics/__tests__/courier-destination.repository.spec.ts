import { describe, expect, it } from 'vitest';

import {
  courierDestinationRepository,
  isKnownCourierZone,
  UnresolvableDestinationError,
} from '../courier-destination.repository';

import prisma from '@/config/db.prisma';

/**
 * The guard that stops a wrong price being sold.
 *
 * Pathao answers an unknown zone with a successful, wrong price rather than an
 * error, so this is the only place that can catch it. Without it, a stale or
 * mistyped zone id prices a Bardibas parcel at the Pokhara rate and nothing
 * complains until a settlement.
 */

async function seedCity(name: string) {
  return prisma.logisticsCity.create({
    data: {
      name,
      province: 'Koshi',
      externalId: Math.floor(100000 + Math.random() * 800000),
    },
  });
}

describe('courier destination', () => {
  it('resolves an address zone to the ids the courier prices on', async () => {
    const city = await seedCity('Pokhara');
    const zone = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 1326, name: 'Pokhara' },
    });

    const destination = await courierDestinationRepository.forZoneId(zone.id);

    expect(destination.zoneExternalId).toBe(1326);
    expect(destination.cityExternalId).toBe(city.externalId);
  });

  it('refuses an address with no district rather than quoting from nothing', async () => {
    await expect(courierDestinationRepository.forZoneId(null)).rejects.toThrow(
      UnresolvableDestinationError,
    );
  });

  it('refuses a zone we do not have, instead of quoting a wrong price', async () => {
    await expect(
      courierDestinationRepository.forZoneId('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(/could not confirm/i);
  });

  it('refuses a zone the courier has stopped serving', async () => {
    // A deactivated zone is a route that no longer exists; quoting it would be
    // selling a delivery nobody will perform.
    const city = await seedCity('Retired City');
    const zone = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 999111, name: 'Old Zone', isActive: false },
    });

    await expect(courierDestinationRepository.forZoneId(zone.id)).rejects.toThrow();
  });

  it('confirms a zone id we recognise, and rejects one we do not', async () => {
    const city = await seedCity('Known City');
    const zone = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 424242, name: 'Known Zone' },
    });

    await expect(isKnownCourierZone(zone.externalId)).resolves.toBe(true);
    // The id Pathao happily priced for us earlier.
    await expect(isKnownCourierZone(999999)).resolves.toBe(false);
  });
});

describe('a city the courier has never described', () => {
  it('is refused, because there is no courier id to price against', async () => {
    // Bootstrap rows come from our own reference data and carry no externalId
    // until a sync fills one in. Quoting from them would mean inventing a rate,
    // which is the whole thing this guard exists to stop.
    const city = await prisma.logisticsCity.create({
      data: { name: 'Unsynced City', province: 'Koshi', externalId: null },
    });
    const zone = await prisma.logisticsZone.create({
      data: { cityId: city.id, externalId: 555001, name: 'Unsynced Zone' },
    });

    await expect(courierDestinationRepository.forZoneId(zone.id)).rejects.toThrow(
      /not yet confirmed/i,
    );
  });
});
