import { logger } from '@celebs/shared-utils';

import { isSandboxCourierFallbackAllowed } from '../sandbox-courier-fallback';

import { resolvePathaoConfig } from './pathao-token.provider';

import { Prisma } from '@/config/db.prisma';

/**
 * Asks Pathao what a parcel costs.
 *
 * Every rule in this file came from the live sandbox, because the documentation
 * is wrong in the places that cost money:
 *
 *  - It says parcels are 0.5-10 kg. The API enforces 0.001-200, priced 150 kg
 *    without complaint, and only refused 250 kg on create-order.
 *  - It does not mention that an invalid `zone_id` returns a *successful* price.
 *    We measured `zone_id: 999999` returning the valley rate with code 200, so a
 *    quote against a zone we do not recognise would silently price at the wrong
 *    rate and nothing would surface it until a settlement.
 *
 * The response shape is validated rather than read permissively. Reading an
 * unfamiliar payload as a zero price would mean selling delivery free and finding
 * out at settlement; failing stops the sale instead.
 */

const PRICE_PLAN_PATH = '/aladdin/api/v1/merchant/price-plan';

export const PARCEL_ITEM_TYPE = 2;
export const DOCUMENT_ITEM_TYPE = 1;

/** Measured: 48 is normal delivery. 12 (on demand) returns 404 in the sandbox. */
export const NORMAL_DELIVERY_TYPE = 48;
export const ON_DEMAND_DELIVERY_TYPE = 12;

/** The courier's real ceiling, not the documented 10. */
export const COURIER_MAX_PARCEL_KG = new Prisma.Decimal(200);
export const COURIER_MIN_PARCEL_KG = new Prisma.Decimal('0.001');

export interface PathaoPricePlanRequest {
  storeId: number;
  itemWeightKg: Prisma.Decimal;
  recipientCityId: number;
  recipientZoneId: number;
  itemType?: number;
  deliveryType?: number;
}

export interface CourierQuote {
  /** What the customer is charged. final_price, never price. */
  finalPrice: Prisma.Decimal;
  /** The courier's own rate plan id, for disputing a charge later. */
  planId: number;
  /** 0.01 means one percent of the amount collected. */
  codPercentage: Prisma.Decimal;
  codEnabled: boolean;
  raw: Record<string, unknown>;
}

type PricePlanBody = Record<string, unknown>;

/**
 * Builds the request, refusing anything the courier would not carry.
 *
 * The weight leaves as a JS number because that is what Pathao's schema accepts.
 * It is the one sanctioned float: it goes out to a third party who will round it
 * to their own bands, and nothing downstream of this call does arithmetic on it.
 */
export function pricePlanRequest(input: PathaoPricePlanRequest): PricePlanBody {
  if (
    input.itemWeightKg.lt(COURIER_MIN_PARCEL_KG) ||
    input.itemWeightKg.gt(COURIER_MAX_PARCEL_KG)
  ) {
    throw new RangeError(
      `Parcel weight ${input.itemWeightKg.toString()} kg is outside what the courier accepts (${COURIER_MIN_PARCEL_KG.toString()}-${COURIER_MAX_PARCEL_KG.toString()} kg)`,
    );
  }

  return {
    store_id: input.storeId,
    item_type: input.itemType ?? PARCEL_ITEM_TYPE,
    delivery_type: input.deliveryType ?? NORMAL_DELIVERY_TYPE,
    item_weight: input.itemWeightKg.toNumber(),
    recipient_city: input.recipientCityId,
    recipient_zone: input.recipientZoneId,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readNumber = (source: Record<string, unknown>, key: string): number => {
  const value = source[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Pathao price-plan response has no usable ${key}`);
  }

  return value;
};

/**
 * Reads a quote, or throws.
 *
 * `final_price` rather than `price`: they differ at low weights (115 against a
 * listed 120) and quoting the higher figure would overcharge the customer on every
 * cheap parcel.
 *
 * An `additional_charge` is refused rather than ignored. It is money the courier
 * adds and we have nowhere to record yet; dropping it under-quotes, and failing
 * stops the sale while there is still time to look at it.
 */
export function parsePathaoPricePlan(payload: unknown): CourierQuote {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new Error('Pathao price-plan response is not the documented shape');
  }

  const data = payload.data;

  const additionalCharge = readNumber(data, 'additional_charge');
  if (additionalCharge > 0) {
    throw new Error(
      `Pathao added a charge of ${additionalCharge} we cannot yet record; refusing to quote without it`,
    );
  }

  const codPercentage = readNumber(data, 'cod_percentage');

  return {
    finalPrice: new Prisma.Decimal(readNumber(data, 'final_price').toFixed(2)),
    planId: readNumber(data, 'plan_id'),
    codPercentage: new Prisma.Decimal(codPercentage.toFixed(4)),
    codEnabled: readNumber(data, 'cod_enabled') === 1,
    raw: data,
  };
}

/**
 * Cache bucket for a parcel weight.
 *
 * Measured: 0.3 kg and 0.5 kg cost the same, 0.6-1.0 cost the same, 1.2-2.0 cost
 * the same, and above 2 kg the courier is linear per kilogram. So light parcels
 * collapse into bands and heavy ones must not - 20 kg is 610 on the Pokhara route
 * and 50 kg is 1360, and one heavy bucket would quote one at the other's price.
 */
export function weightBandFor(weightKg: Prisma.Decimal): string {
  if (weightKg.lte(new Prisma.Decimal('0.5'))) return '0.5';
  if (weightKg.lte(new Prisma.Decimal('1.0'))) return '1.0';
  if (weightKg.lte(new Prisma.Decimal('2.0'))) return '2.0';

  // Whole kilograms above the last band, so 20 and 50 never share a key.
  return weightKg.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0);
}

export class PathaoPriceClient {
  /**
   * The base URL resolves per call, not at construction: the module singleton
   * is built at import time, and importing a module must not throw for a
   * missing variable.
   */
  constructor(
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
    private readonly baseUrlOverride?: string,
  ) {}

  private baseUrl(): string {
    return this.baseUrlOverride ?? resolvePathaoConfig().baseUrl;
  }

  /**
   * One courier quote.
   *
   * Callers are expected to have validated `recipientZoneId` against our own
   * synced tables first. Pathao answers an unknown zone with a successful price
   * rather than an error, so an unvalidated zone is a wrong quote nobody notices.
   */
  async quote(input: PathaoPricePlanRequest & { accessToken: string }): Promise<CourierQuote> {
    const response = await this.fetchImpl(`${this.baseUrl()}${PRICE_PLAN_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify(pricePlanRequest(input)),
      signal: AbortSignal.timeout(isSandboxCourierFallbackAllowed() ? 3_000 : 8_000),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(
        { status: response.status, body: body.slice(0, 300) },
        'Pathao price-plan refused the quote',
      );
      throw new Error(`Pathao price-plan failed with status ${response.status}`);
    }

    return parsePathaoPricePlan(await response.json());
  }
}

export const pathaoPriceClient = new PathaoPriceClient();
