import { describe, expect, it, vi } from 'vitest';

// The suite-wide setup stubs this module to prevent live courier orders during general tests.
// This file is the dedicated unit test suite for the client, so it takes the real implementation back.
vi.unmock('@/modules/logistics/adapters/pathao-order.client');

import {
  buildPathaoOrderPayload,
  parsePathaoOrderResponse,
  PathaoOrderClient,
  type PathaoOrderPayloadInput,
} from '../pathao-order.client';
import {
  COURIER_MAX_PARCEL_KG,
  COURIER_MIN_PARCEL_KG,
  NORMAL_DELIVERY_TYPE,
  PARCEL_ITEM_TYPE,
} from '../pathao-price.client';

import { Prisma } from '@/config/db.prisma';

describe('PathaoOrderClient', () => {
  const validInput: PathaoOrderPayloadInput = {
    storeId: 130903,
    merchantOrderId: 'ORD-1001-P1',
    recipientName: 'Aarav Sharma',
    recipientPhone: '9841234567',
    recipientAddress: 'New Baneshwor, Kathmandu',
    recipientCityId: 79,
    recipientZoneId: 1326,
    itemQuantity: 2,
    itemWeightKg: new Prisma.Decimal('1.5'),
    amountToCollect: 1500,
    itemDescription: 'Cotton Shirts',
  };

  describe('buildPathaoOrderPayload', () => {
    it('builds the exact payload expected by Pathao Merchant API', () => {
      const payload = buildPathaoOrderPayload(validInput);

      expect(payload).toEqual({
        store_id: 130903,
        merchant_order_id: 'ORD-1001-P1',
        recipient_name: 'Aarav Sharma',
        recipient_phone: '9841234567',
        recipient_address: 'New Baneshwor, Kathmandu',
        recipient_city: 79,
        recipient_zone: 1326,
        recipient_area: undefined,
        delivery_type: NORMAL_DELIVERY_TYPE,
        item_type: PARCEL_ITEM_TYPE,
        item_quantity: 2,
        item_weight: 1.5,
        amount_to_collect: 1500,
        item_description: 'Cotton Shirts',
        special_instruction: undefined,
      });
    });

    it('refuses non-integer amount_to_collect to prevent courier rejection', () => {
      // Pathao explicitly rejects decimal amounts (e.g. 1500.75) with 400.
      // Every paisa must be resolved before calling createOrder.
      expect(() =>
        buildPathaoOrderPayload({
          ...validInput,
          amountToCollect: 1500.5,
        }),
      ).toThrow(/integer/i);
    });

    it('refuses parcel weights outside accepted 0.001 - 200 kg bounds', () => {
      expect(() =>
        buildPathaoOrderPayload({
          ...validInput,
          itemWeightKg: COURIER_MIN_PARCEL_KG.dividedBy(2),
        }),
      ).toThrow(RangeError);

      expect(() =>
        buildPathaoOrderPayload({
          ...validInput,
          itemWeightKg: COURIER_MAX_PARCEL_KG.plus('1'),
        }),
      ).toThrow(RangeError);
    });

    it('refuses blank recipient phone number', () => {
      expect(() =>
        buildPathaoOrderPayload({
          ...validInput,
          recipientPhone: '   ',
        }),
      ).toThrow(/phone/i);
    });
  });

  describe('parsePathaoOrderResponse', () => {
    it('parses synchronous order creation response with consignment_id and delivery_fee', () => {
      const response = {
        type: 'success',
        code: 200,
        message: 'Order created successfully',
        data: {
          consignment_id: 'PT-987654321',
          merchant_order_id: 'ORD-1001-P1',
          order_status: 'Pending',
          delivery_fee: 140,
        },
      };

      const result = parsePathaoOrderResponse(response);

      expect(result.consignmentId).toBe('PT-987654321');
      expect(result.merchantOrderId).toBe('ORD-1001-P1');
      expect(result.deliveryFee.toString()).toBe('140');
      expect(result.trackingUrl).toContain('PT-987654321');
      expect(result.orderStatus).toBe('Pending');
    });

    it('refuses payloads missing consignment_id', () => {
      const invalid = {
        type: 'success',
        code: 200,
        data: {
          delivery_fee: 140,
        },
      };

      expect(() => parsePathaoOrderResponse(invalid)).toThrow(/consignment_id/i);
    });
  });

  describe('PathaoOrderClient.createOrder', () => {
    it('posts to /aladdin/api/v1/orders with bearer token and parses result', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'success',
          code: 200,
          data: {
            consignment_id: 'PT-11223344',
            merchant_order_id: 'ORD-1001-P1',
            delivery_fee: 150,
          },
        }),
      });

      const client = new PathaoOrderClient(
        mockFetch as never,
        'https://courier-api-sandbox.pathao.com',
      );

      const result = await client.createOrder({
        ...validInput,
        accessToken: 'valid-test-bearer-token',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://courier-api-sandbox.pathao.com/aladdin/api/v1/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authorization: 'Bearer valid-test-bearer-token',
            'content-type': 'application/json',
          }),
        }),
      );

      expect(result.consignmentId).toBe('PT-11223344');
      expect(result.deliveryFee.toString()).toBe('150');
    });

    it('throws descriptive error on courier API failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ message: 'Store not found' }),
      });

      const client = new PathaoOrderClient(
        mockFetch as never,
        'https://courier-api-sandbox.pathao.com',
      );

      await expect(
        client.createOrder({
          ...validInput,
          accessToken: 'valid-test-bearer-token',
        }),
      ).rejects.toThrow(/status 422/);
    });
  });
});
