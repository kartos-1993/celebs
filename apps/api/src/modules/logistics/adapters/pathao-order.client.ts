import { logger } from '@celebs/shared-utils';

import {
  COURIER_MAX_PARCEL_KG,
  COURIER_MIN_PARCEL_KG,
  NORMAL_DELIVERY_TYPE,
  PARCEL_ITEM_TYPE,
} from './pathao-price.client';
import { resolvePathaoConfig } from './pathao-token.provider';

import { Prisma } from '@/config/db.prisma';

/**
 * Pathao Merchant API order creation endpoint.
 *
 * Measured facts from live sandbox & Merchant API doc:
 *  - Single `POST /aladdin/api/v1/orders` returns consignment id and delivery fee synchronously.
 *    (Bulk `POST /orders/bulk` returns 202 without tracking IDs and cannot be polled).
 *  - `amount_to_collect` MUST be an integer; decimal paisas are rejected with HTTP 400.
 *  - Weight limits accepted are 0.001 - 200 kg.
 *  - Standard delivery type is 48; parcel item type is 2.
 */
export const ORDER_CREATION_PATH = '/aladdin/api/v1/orders';

export interface PathaoOrderPayloadInput {
  storeId: number;
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCityId: number;
  recipientZoneId: number;
  recipientAreaId?: number;
  deliveryType?: number;
  itemType?: number;
  itemQuantity: number;
  itemWeightKg: Prisma.Decimal;
  /** Amount to collect from recipient in whole integer rupees (0 for prepaid). */
  amountToCollect: number;
  itemDescription?: string;
  specialInstruction?: string;
}

export interface PathaoOrderResult {
  consignmentId: string;
  merchantOrderId: string;
  deliveryFee: Prisma.Decimal;
  trackingUrl: string;
  orderStatus?: string;
  raw: Record<string, unknown>;
}

export type PathaoOrderRequestBody = {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: number;
  item_type: number;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description: string;
  special_instruction?: string;
};

/**
 * Builds and validates the JSON payload for Pathao single order creation.
 *
 * Fails closed before transmitting if any invariant (bounds, phone, integer amount)
 * would cause an invalid booking or courier rejection.
 */
export function buildPathaoOrderPayload(input: PathaoOrderPayloadInput): PathaoOrderRequestBody {
  if (
    input.itemWeightKg.lt(COURIER_MIN_PARCEL_KG) ||
    input.itemWeightKg.gt(COURIER_MAX_PARCEL_KG)
  ) {
    throw new RangeError(
      `Parcel weight ${input.itemWeightKg.toString()} kg is outside what the courier accepts (${COURIER_MIN_PARCEL_KG.toString()}-${COURIER_MAX_PARCEL_KG.toString()} kg)`,
    );
  }

  if (!Number.isInteger(input.amountToCollect) || input.amountToCollect < 0) {
    throw new RangeError(
      `Pathao requires amount_to_collect to be a non-negative integer rupee amount, got ${input.amountToCollect}`,
    );
  }

  const phone = input.recipientPhone.trim();
  if (!phone) {
    throw new Error('Recipient phone number is required for courier dispatch');
  }

  return {
    store_id: input.storeId,
    merchant_order_id: input.merchantOrderId,
    recipient_name: input.recipientName.trim(),
    recipient_phone: phone,
    recipient_address: input.recipientAddress.trim(),
    recipient_city: input.recipientCityId,
    recipient_zone: input.recipientZoneId,
    recipient_area: input.recipientAreaId,
    delivery_type: input.deliveryType ?? NORMAL_DELIVERY_TYPE,
    item_type: input.itemType ?? PARCEL_ITEM_TYPE,
    item_quantity: Math.max(1, input.itemQuantity),
    item_weight: input.itemWeightKg.toNumber(),
    amount_to_collect: input.amountToCollect,
    item_description: input.itemDescription?.trim() || 'Marketplace parcel',
    special_instruction: input.specialInstruction?.trim() || undefined,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Parses and verifies the synchronous order creation response returned by Pathao.
 *
 * Guarantees that a valid tracking consignment_id is present before accepting
 * the response.
 */
export function parsePathaoOrderResponse(payload: unknown): PathaoOrderResult {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new Error('Pathao order response does not match the documented envelope');
  }

  const data = payload.data;
  const consignmentId = data.consignment_id;
  if (typeof consignmentId !== 'string' || consignmentId.trim() === '') {
    throw new Error('Pathao order response has no usable consignment_id');
  }

  const merchantOrderId = typeof data.merchant_order_id === 'string' ? data.merchant_order_id : '';
  const orderStatus = typeof data.order_status === 'string' ? data.order_status : undefined;

  let deliveryFeeDecimal = new Prisma.Decimal(0);
  if (typeof data.delivery_fee === 'number' && Number.isFinite(data.delivery_fee)) {
    deliveryFeeDecimal = new Prisma.Decimal(data.delivery_fee.toFixed(2));
  } else if (typeof data.delivery_fee === 'string' && data.delivery_fee.trim() !== '') {
    deliveryFeeDecimal = new Prisma.Decimal(data.delivery_fee);
  }

  // Pathao's consumer tracking link for a consignment
  const trackingUrl =
    typeof data.tracking_url === 'string' && data.tracking_url.trim() !== ''
      ? data.tracking_url
      : `https://pathao.com/track/?consignment_id=${consignmentId}`;

  return {
    consignmentId,
    merchantOrderId,
    deliveryFee: deliveryFeeDecimal,
    trackingUrl,
    orderStatus,
    raw: data,
  };
}

/**
 * Client for creating shipments on Pathao Courier via synchronous REST API.
 */
export class PathaoOrderClient {
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
   * Books a single parcel consignment with Pathao.
   *
   * Returns tracking consignment_id and delivery fee synchronously.
   */
  async createOrder(
    input: PathaoOrderPayloadInput & { accessToken: string },
  ): Promise<PathaoOrderResult> {
    const payload = buildPathaoOrderPayload(input);

    const response = await this.fetchImpl(`${this.baseUrl()}${ORDER_CREATION_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error(
        { status: response.status, body: body.slice(0, 300) },
        'Pathao create-order request failed',
      );
      throw new Error(`Pathao create-order failed with status ${response.status}`);
    }

    const json = await response.json();
    return parsePathaoOrderResponse(json);
  }
}

export const pathaoOrderClient = new PathaoOrderClient();
