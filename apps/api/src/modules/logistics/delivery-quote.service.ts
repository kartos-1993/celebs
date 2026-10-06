import {
  type CourierQuote,
  PathaoPriceClient,
  pathaoPriceClient,
  type PathaoPricePlanRequest,
  weightBandFor,
} from './adapters/pathao-price.client';
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
  weightKg: Prisma.Decimal;
  goodsAmount: Prisma.Decimal;
  lineIds: string[];
}

export interface QuotedParcel {
  vendorId: string;
  weightKg: Prisma.Decimal;
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
  /** What the customer is charged for delivery in total. */
  totalDeliveryFee: Prisma.Decimal;
  parcels: QuotedParcel[];
  /** 0.01 means one percent of the amount collected. */
  codPercentage: Prisma.Decimal;
  /** The charge added on top when the customer pays cash on delivery. */
  codHandlingFee: Prisma.Decimal;
  /** The amount the courier will collect: goods plus delivery plus the handling fee. */
  collectibleAmount: Prisma.Decimal;
  currency: string;
}

export interface QuoteDeliveryInput {
  parcels: QuoteSellerParcelInput[];
  /** Pathao's external ids, already resolved from our own synced tables. */
  recipientCityExternalId: number;
  recipientZoneExternalId: number;
  isCod: boolean;
  storeId: number;
}

const ZERO = new Prisma.Decimal(0);
const MONEY_PLACES = 2;

const money = (value: Prisma.Decimal) => value.toDecimalPlaces(MONEY_PLACES);

export interface DeliveryQuoteCache {
  get(key: string): Promise<CourierQuote | null>;
  set(key: string, value: CourierQuote): Promise<void>;
}

/** Supplies a valid Pathao bearer token. The token provider owns caching and refresh. */
export type AccessTokenResolver = () => Promise<string>;

export class DeliveryQuoteService {
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
          weightKg: parcel.weightKg,
          goodsAmount: parcel.goodsAmount,
          deliveryFee: cached.finalPrice,
          planId: cached.planId,
          lineIds: parcel.lineIds,
          cached: true,
          codPercentage: cached.codPercentage,
        });
        continue;
      }

      const courierQuote = await this.client.quote({
        storeId: input.storeId,
        itemWeightKg: parcel.weightKg,
        recipientCityId: input.recipientCityExternalId,
        recipientZoneId: input.recipientZoneExternalId,
        accessToken: await this.tokenResolver(),
      } as PathaoPricePlanRequest & { accessToken: string });

      await this.cache?.set(key, courierQuote);

      quoted.push({
        vendorId: parcel.vendorId,
        weightKg: parcel.weightKg,
        goodsAmount: parcel.goodsAmount,
        deliveryFee: courierQuote.finalPrice,
        planId: courierQuote.planId,
        lineIds: parcel.lineIds,
        cached: false,
        codPercentage: courierQuote.codPercentage,
      });
    }

    return this.buildQuote(quoted, input.isCod);
  }

  /**
   * Cache key: the inputs the courier actually prices on.
   *
   * The weight is bucketed rather than exact, because light parcels the courier
   * charges identically must share a key while heavy ones - priced per kilogram -
   * must not.
   */
  private cacheKey(input: QuoteDeliveryInput, parcel: { weightKg: Prisma.Decimal }): string {
    return [
      'delivery-quote',
      input.storeId,
      input.recipientCityExternalId,
      input.recipientZoneExternalId,
      weightBandFor(parcel.weightKg),
    ].join(':');
  }

  private buildQuote(parcels: QuotedParcel[], isCod: boolean): DeliveryQuote {
    const codPercentage = parcels[0]?.codPercentage ?? ZERO;
    const totalDeliveryFee = parcels.reduce(
      (total, parcel) => total.plus(parcel.deliveryFee),
      ZERO,
    );

    // The courier's cash-handling charge is a percentage of what they collect, so
    // it cannot be known until the total is. Charged to the customer and disclosed
    // at checkout: it is their money collected, and passing it through at cost is
    // what makes it defensible to show at all.
    const beforeHandling = parcels
      .reduce((total, parcel) => total.plus(parcel.goodsAmount), ZERO)
      .plus(totalDeliveryFee);

    // codPercentage is a fraction (0.01 = 1%), so it is multiplied, not divided by
    // 100 again - doing that charged 0.12 where the courier charges 11.50.
    const codHandlingFee = isCod ? money(beforeHandling.mul(codPercentage)) : ZERO;

    return {
      totalDeliveryFee: money(totalDeliveryFee),
      parcels,
      codPercentage,
      codHandlingFee,
      collectibleAmount: money(beforeHandling.plus(codHandlingFee)),
      currency: 'NPR',
    };
  }
}

export const deliveryQuoteService = new DeliveryQuoteService();
