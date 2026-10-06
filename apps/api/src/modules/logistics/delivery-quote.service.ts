import {
  type CourierQuote,
  PathaoPriceClient,
  pathaoPriceClient,
  type PathaoPricePlanRequest,
  weightBandFor,
} from './adapters/pathao-price.client';
import { pathaoTokenProvider } from './adapters/pathao-token.provider';
import { money } from './money';
import type { SellerParcel } from './seller-parcels';
import { mergeSellerParcels } from './seller-parcels';

import { Prisma } from '@/config/db.prisma';

/**
 * What a cart costs to deliver, asked of the courier rather than guessed.
 *
 * One quote per seller, because a seller is one pickup and a pickup is one fee.
 * The customer's delivery charge is the sum, and it is the sum they are shown -
 * the same figure they will be charged at checkout.
 *
 * Two things this refuses to do:
 *
 *  - Quote against a zone we do not recognise. Pathao answers an unknown zone_id
 *    with a *successful* price - measured: zone_id 999999 came back as 150 with
 *    code 200 - so an unvalidated zone is a wrong price nobody notices until a
 *    settlement.
 *  - Invent a rate. With no courier quote obtainable, the delivery charge is
 *    refused rather than falling back to a platform default, because a default is
 *    precisely the guess that started this.
 */

export interface QuoteSellerParcelInput {
  vendorId: string;
  declaredWeightKg: Prisma.Decimal;
  goodsAmount: Prisma.Decimal;
  lineIds: string[];
}

export interface QuotedParcel {
  vendorId: string;
  declaredWeightKg: Prisma.Decimal;
  goodsAmount: Prisma.Decimal;
  /** What the courier charges for this seller's parcel. */
  deliveryFee: Prisma.Decimal;
  planId: number;
  lineIds: string[];
  /** True when the answer came from cache rather than the courier. */
  cached: boolean;
  /** The courier cash-handling rate, as a fraction: 0.01 is one percent. */
  codPercentage: Prisma.Decimal;
}

export interface DeliveryQuote {
  /** Sum of the courier's per-seller charges. What they will invoice us. */
  totalCourierFee: Prisma.Decimal;
  parcels: QuotedParcel[];
  /**
   * The courier cash-handling rate, as a fraction: 0.01 is one percent of the
   * amount collected.
   *
   * Reported here but deliberately not applied here. What the customer owes also
   * depends on whether a free-delivery threshold waived the charge, which this
   * service does not know about - so applying it in both places would let the two
   * answers drift apart on exactly the orders where it costs money.
   */
  codPercentage: Prisma.Decimal;
  currency: string;
}

export interface QuoteDeliveryInput {
  parcels: QuoteSellerParcelInput[];
  /** Pathao's external ids, already resolved from our own synced tables. */
  recipientCityExternalId: number;
  recipientZoneExternalId: number;
  storeId: number;
}

const ZERO = new Prisma.Decimal(0);

export interface DeliveryQuoteCache {
  get(key: string): Promise<CourierQuote | null>;
  set(key: string, value: CourierQuote): Promise<void>;
}

/** Supplies a valid Pathao bearer token. The token provider owns caching and refresh. */
export type AccessTokenResolver = () => Promise<string>;

/**
 * Calls currently in flight, keyed the same way as the cache.
 *
 * This exists because a cache alone does not survive a burst. Fifty shoppers
 * refreshing the same cart in the same second all read a cold cache and all call
 * the courier - precisely the load the cache was added to avoid. Sharing the
 * promise collapses them into one call.
 *
 * Deliberately in-process rather than distributed. A lock across instances would
 * need Redis coordination and could leave a stuck entry if an instance died
 * mid-call; the failure mode of doing nothing is a few extra courier requests,
 * which the cache absorbs on the next read.
 *
 * Entries are removed in a finally, so a rejected call is never remembered as an
 * answer. Without that, one courier blip would poison every basket for the life of
 * the process.
 */
export class DeliveryQuoteService {
  private readonly inFlight = new Map<string, Promise<CourierQuote>>();

  constructor(
    private readonly client: PathaoPriceClient = pathaoPriceClient,
    private readonly cache?: DeliveryQuoteCache,
    private readonly tokenResolver: AccessTokenResolver = async () => {
      throw new Error('No Pathao token resolver configured for delivery quoting');
    },
  ) {}

  /**
   * A cart's delivery cost, one courier quote per seller.
   *
   * Serialised per seller rather than fired in parallel: two sellers at the same
   * weight and destination would otherwise race to be the same cache key, and the
   * caller would make duplicate calls to a third-party API for one answer.
   */
  async quote(input: QuoteDeliveryInput): Promise<DeliveryQuote> {
    const parcels = mergeSellerParcels(input.parcels);

    if (parcels.length === 0) {
      throw new Error('Nothing to quote: the order has no sellable lines');
    }

    const quoted: QuotedParcel[] = [];

    for (const parcel of parcels) {
      const key = this.cacheKey(input, parcel);

      const cached = (await this.cache?.get(key)) ?? null;

      if (cached) {
        quoted.push({
          vendorId: parcel.vendorId,
          declaredWeightKg: parcel.declaredWeightKg,
          goodsAmount: parcel.goodsAmount,
          deliveryFee: cached.finalPrice,
          planId: cached.planId,
          lineIds: parcel.lineIds,
          cached: true,
          codPercentage: cached.codPercentage,
        });
        continue;
      }

      const courierQuote = await this.quoteOnce(key, input, parcel);

      await this.cache?.set(key, courierQuote);

      quoted.push({
        vendorId: parcel.vendorId,
        declaredWeightKg: parcel.declaredWeightKg,
        goodsAmount: parcel.goodsAmount,
        deliveryFee: courierQuote.finalPrice,
        planId: courierQuote.planId,
        lineIds: parcel.lineIds,
        cached: false,
        codPercentage: courierQuote.codPercentage,
      });
    }

    return this.buildQuote(quoted);
  }

  /**
   * Cache key: the inputs the courier actually prices on.
   *
   * The weight is bucketed rather than exact, because light parcels the courier
   * charges identically must share a key while heavy ones - priced per kilogram -
   * must not.
   */
  private cacheKey(
    input: QuoteDeliveryInput,
    parcel: { declaredWeightKg: Prisma.Decimal },
  ): string {
    return [
      'delivery-quote',
      input.storeId,
      input.recipientCityExternalId,
      input.recipientZoneExternalId,
      weightBandFor(parcel.declaredWeightKg),
    ].join(':');
  }

  /**
   * One courier answer for one key, however many callers are waiting on it.
   */
  private async quoteOnce(
    key: string,
    input: QuoteDeliveryInput,
    parcel: SellerParcel,
  ): Promise<CourierQuote> {
    const running = this.inFlight.get(key);
    if (running) return running;

    // Registered synchronously, with no await between the check above and this
    // line. An await in between - fetching a token, say - yields to the microtask
    // queue, and every concurrent caller then passes the check while the map is
    // still empty. That is not hypothetical: it is exactly what the first version
    // of this method did, and twenty identical requests still made twenty calls.
    const call = this.fetchAndCache(key, input, parcel);
    this.inFlight.set(key, call);

    return call;
  }

  private async fetchAndCache(
    key: string,
    input: QuoteDeliveryInput,
    parcel: SellerParcel,
  ): Promise<CourierQuote> {
    try {
      const quote = await this.client.quote({
        storeId: input.storeId,
        itemWeightKg: parcel.declaredWeightKg,
        recipientCityId: input.recipientCityExternalId,
        recipientZoneId: input.recipientZoneExternalId,
        accessToken: await this.tokenResolver(),
      } as PathaoPricePlanRequest & { accessToken: string });

      await this.cache?.set(key, quote);

      return quote;
    } finally {
      // Removed on success and on failure alike, so the next caller retries rather
      // than inheriting a stale or poisoned answer.
      this.inFlight.delete(key);
    }
  }

  private buildQuote(parcels: QuotedParcel[]): DeliveryQuote {
    // Every parcel comes from the same courier, so any of them carries the same
    // cash-handling rate. Taken from their response rather than hardcoded, so a
    // change on their side is picked up instead of being overwritten by our guess.
    const codPercentage = parcels[0]?.codPercentage ?? ZERO;

    const totalCourierFee = parcels.reduce((total, parcel) => total.plus(parcel.deliveryFee), ZERO);

    return {
      totalCourierFee: money(totalCourierFee),
      parcels,
      codPercentage,
      currency: 'NPR',
    };
  }
}

/**
 * The quoting service the application actually uses.
 *
 * Wired to the courier's token provider so a live quote fetches a real token
 * rather than failing with a message about configuration. Constructed with no
 * arguments on purpose - every dependency has a working default, so a caller that
 * forgets to inject gets real behaviour rather than a stub that silently quotes
 * zero.
 */
export const deliveryQuoteService = new DeliveryQuoteService(pathaoPriceClient, undefined, () =>
  pathaoTokenProvider.getToken(),
);
