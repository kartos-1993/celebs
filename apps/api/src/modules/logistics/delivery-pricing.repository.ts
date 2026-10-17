import type { RateBand } from './delivery-pricing';

import { Prisma, prisma } from '@/config/db.prisma';

/**
 * The free-delivery threshold for a destination, and the cost of waiving it.
 *
 * The threshold is per delivery city because delivery inside the Kathmandu Valley
 * costs the courier far less than delivery to Biratnagar, so one platform-wide
 * number would either over-promise in the valley or overcharge everywhere else.
 *
 * Money and weight stay `Prisma.Decimal` from the database all the way into the
 * pricing resolver. Converting here for convenience would reintroduce float drift
 * on the exact figures a courier invoice is reconciled against.
 */

export interface DeliveryZonePricing {
  cityId: string | null;
  zoneId: string | null;
  cityName: string | null;
  isValley: boolean;
  freeDeliveryThreshold: Prisma.Decimal;
}

const unresolved = (): DeliveryZonePricing => ({
  cityId: null,
  zoneId: null,
  cityName: null,
  isValley: false,
  freeDeliveryThreshold: new Prisma.Decimal(UNRESOLVED_FREE_DELIVERY_THRESHOLD),
});

/**
 * Used when the destination is not known yet, or could not be resolved.
 *
 * Deliberately the *higher* of the two thresholds. A cart that does not yet know
 * where it is going must not advertise a free-delivery promise the server would
 * then decline to honour - that is the same class of bug as the app promising
 * free delivery and the checkout charging for it.
 */
export const UNRESOLVED_FREE_DELIVERY_THRESHOLD = 5000;

export class DeliveryPricingRepository {
  /**
   * Resolves the threshold for an address's courier zone.
   *
   * Returns the conservative threshold when the zone is missing, which is the
   * honest answer: we do not know the destination yet.
   */
  async thresholdForAddress(address: {
    logisticsZoneId: string | null;
  }): Promise<DeliveryZonePricing> {
    if (!address.logisticsZoneId) return unresolved();

    const zone = await prisma.logisticsZone.findUnique({
      where: { id: address.logisticsZoneId },
      select: {
        id: true,
        name: true,
        isActive: true,
        city: {
          select: {
            id: true,
            name: true,
            isValley: true,
            isActive: true,
            freeDeliveryThreshold: true,
          },
        },
      },
    });

    if (!zone || !zone.isActive || !zone.city.isActive) return unresolved();

    return {
      cityId: zone.city.id,
      zoneId: zone.id,
      cityName: zone.city.name,
      isValley: zone.city.isValley,
      // Stored as a whole-rupee Int, so this conversion is exact. It becomes a
      // Decimal here because everything downstream compares it against money,
      // and the threshold must be judged with the same arithmetic as the fee it
      // is being compared to.
      freeDeliveryThreshold: new Prisma.Decimal(zone.city.freeDeliveryThreshold),
    };
  }

  /** Active rate bands; most specific first is resolved by the caller. */
  async activeRates(cityId: string | null): Promise<RateBand[]> {
    const rows = await prisma.shippingRate.findMany({
      where: { isActive: true, OR: [{ cityId: null }, ...(cityId ? [{ cityId }] : [])] },
      orderBy: { minWeightKg: 'asc' },
      select: {
        id: true,
        cityId: true,
        minWeightKg: true,
        maxWeightKg: true,
        fee: true,
        codFee: true,
        isActive: true,
      },
    });

    return rows;
  }
}

export const deliveryPricingRepository = new DeliveryPricingRepository();
