import { logger } from '@celebs/shared-utils';

import { resolvePathaoConfig } from './adapters/pathao-token.provider';
import {
  CourierDestinationRepository,
  courierDestinationRepository,
} from './courier-destination.repository';
import { applyDeliveryPolicy } from './delivery-policy';
import { deliveryPricingRepository } from './delivery-pricing.repository';
import { UNRESOLVED_FREE_DELIVERY_THRESHOLD } from './delivery-pricing.repository';
import type { QuoteSellerParcelInput } from './delivery-quote.service';
import { DeliveryQuoteService, deliveryQuoteService } from './delivery-quote.service';
import { money } from './money';

import { Prisma } from '@/config/db.prisma';

/**
 * What the cart shows.
 *
 * Checkout is the authority, and it prices with the courier. This exists so the
 * cart is not the one screen still guessing: a shopper shown a band estimate and
 * billed a courier price has been told one number and charged another, which is
 * the fastest way to lose a customer who notices.
 *
 * Unlike checkout, this never fails the request. A cart has to load. So every
 * courier problem - unreachable, slow, a district we cannot resolve - falls back
 * to the flat policy fee and is marked as an estimate, which lets the app say the
 * figure may move instead of presenting a guess as the price.
 */
export interface DeliveryPreviewInput {
  subtotal: Prisma.Decimal;
  parcels: QuoteSellerParcelInput[];
  /** The delivery district on the address, in our own ids. */
  logisticsZoneId: string | null;
  isCod: boolean;
}

export interface DeliveryPreview {
  /** What to show the customer for delivery. */
  charge: Prisma.Decimal;
  /** What the courier will invoice us, when we know it. */
  courierCost: Prisma.Decimal;
  /** Delivery given away to reach the threshold. */
  absorbedCost: Prisma.Decimal;
  /** True when this is our estimate rather than the courier's answer. */
  isEstimate: boolean;
}

const ZERO = new Prisma.Decimal(0);

export class DeliveryPreviewService {
  constructor(
    private readonly quoteSvc: DeliveryQuoteService = deliveryQuoteService,
    private readonly destinationRepo: CourierDestinationRepository = courierDestinationRepository,
    private readonly pricingRepo = deliveryPricingRepository,
    private readonly flatShippingFee: Prisma.Decimal = ZERO,
    private readonly storeId: number = resolvePathaoConfig().storeId,
  ) {}

  /**
   * The district's own free-delivery promise.
   *
   * Falls back to the conservative platform threshold when it cannot be read, so a
   * missing row makes us charge rather than promise.
   */
  private async thresholdFor(logisticsZoneId: string | null): Promise<Prisma.Decimal> {
    if (!logisticsZoneId) return new Prisma.Decimal(UNRESOLVED_FREE_DELIVERY_THRESHOLD);

    try {
      const threshold = await this.pricingRepo.thresholdForAddress({ logisticsZoneId });
      return threshold.freeDeliveryThreshold;
    } catch {
      return new Prisma.Decimal(UNRESOLVED_FREE_DELIVERY_THRESHOLD);
    }
  }

  async preview(input: DeliveryPreviewInput): Promise<DeliveryPreview> {
    if (input.parcels.length === 0 || input.subtotal.isZero()) {
      return { charge: ZERO, courierCost: ZERO, absorbedCost: ZERO, isEstimate: false };
    }

    try {
      const destination = await this.destinationRepo.forZoneId(input.logisticsZoneId);

      const quote = await this.quoteSvc.quote({
        parcels: input.parcels,
        recipientCityExternalId: destination.cityExternalId,
        recipientZoneExternalId: destination.zoneExternalId,
        storeId: this.storeId,
      });

      const threshold = await this.thresholdFor(input.logisticsZoneId);

      const applied = applyDeliveryPolicy({
        subtotal: input.subtotal,
        quotedCourierFee: quote.totalCourierFee,
        freeDeliveryThreshold: threshold,
        isCod: input.isCod,
        codPercentage: quote.codPercentage,
      });

      return {
        charge: applied.customerCharge,
        courierCost: applied.courierCost,
        absorbedCost: applied.absorbedCost,
        isEstimate: false,
      };
    } catch (err: unknown) {
      logger.warn(
        { err },
        'Could not quote the courier for the cart; showing an estimated delivery charge',
      );

      // Our old answer, kept only for when the courier cannot be reached. Not a
      // rate band: a band would be a second guess about a courier's pricing layered
      // on top of the first, and the point of this work is to stop guessing.
      // The threshold still applies on the fallback path. A cart over the threshold
      // must be shown free delivery even when we could not reach the courier -
      // promising free delivery and then charging for it is precisely the bug this
      // service exists to remove, and it would be reintroduced by a fallback that
      // quietly ignored the promise.
      const flatFee = money(this.flatShippingFee);
      const threshold = await this.thresholdFor(input.logisticsZoneId);
      const waived = !threshold.isNegative() && input.subtotal.greaterThanOrEqualTo(threshold);

      return {
        charge: waived ? ZERO : flatFee,
        courierCost: flatFee,
        absorbedCost: waived ? flatFee : ZERO,
        isEstimate: true,
      };
    }
  }
}
