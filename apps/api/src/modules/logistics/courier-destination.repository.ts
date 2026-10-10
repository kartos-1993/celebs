import { Prisma, prisma } from '@/config/db.prisma';

/**
 * Resolves a delivery address to the courier's own city and zone ids.
 *
 * The reason this exists as its own gate: Pathao answers an unknown `zone_id`
 * with a *successful* price rather than an error. Measured - `zone_id: 999999`
 * came back as price 150, plan 174, code 200, which is the Pokhara rate. So a
 * quote against a zone we cannot vouch for is not a failed quote, it is a wrong
 * one that nobody notices until a settlement disagrees with it.
 *
 * Hence the hard failure. "We do not know where this is" is a much better outcome
 * than charging the valley rate for a parcel going to Bardibas.
 */

export interface CourierDestination {
  cityExternalId: number;
  zoneExternalId: number;
  cityName: string;
  zoneName: string;
}

export class UnresolvableDestinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnresolvableDestinationError';
  }
}

export class CourierDestinationRepository {
  /**
   * The zone on an address, with its courier ids.
   *
   * Joins through to the city's external id too: price-plan takes both, and a
   * zone whose city we cannot identify is as unusable as a missing zone.
   *
   * Requires the zone and city to be active. A deactivated zone is one the courier
   * has stopped serving, and quoting it would be quoting a route that no longer
   * exists.
   */
  async forZoneId(logisticsZoneId: string | null | undefined): Promise<CourierDestination> {
    if (!logisticsZoneId) {
      throw new UnresolvableDestinationError(
        'This address has no delivery district yet. Please re-select the district so we can check delivery.',
      );
    }

    const zone = await prisma.logisticsZone.findFirst({
      where: { id: logisticsZoneId, isActive: true },
      select: {
        externalId: true,
        name: true,
        city: { select: { externalId: true, name: true, isActive: true } },
      },
    });

    if (!zone || !zone.city.isActive) {
      throw new UnresolvableDestinationError(
        'We could not confirm delivery to this area. Please re-select your district so we can check.',
      );
    }

    // A bootstrapped city has no courier id until a sync fills one in. It is a row
    // we invented, not one the courier described, so there is nothing to price
    // against - and quoting from our own guess is the thing this file exists to
    // prevent.
    if (zone.city.externalId === null) {
      throw new UnresolvableDestinationError(
        `We have not yet confirmed delivery to ${zone.city.name}. Please choose a different area, or try again shortly.`,
      );
    }

    return {
      cityExternalId: zone.city.externalId,
      zoneExternalId: zone.externalId,
      cityName: zone.city.name,
      zoneName: zone.name,
    };
  }
}

export const courierDestinationRepository = new CourierDestinationRepository();

/**
 * Confirms a courier zone id is one we know.
 *
 * Used where a zone id arrives from elsewhere - a saved cart, an address the
 * customer edited - and must be re-checked rather than trusted.
 */
export async function isKnownCourierZone(zoneExternalId: number): Promise<boolean> {
  const zone = await prisma.logisticsZone.findFirst({
    where: { externalId: zoneExternalId, isActive: true },
    select: { id: true },
  });

  return zone !== null;
}

export const ZERO_MONEY = new Prisma.Decimal(0);
