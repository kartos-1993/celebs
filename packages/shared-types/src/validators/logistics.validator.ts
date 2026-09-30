import { z } from 'zod';

export const dispatchOrderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  provider: z.enum(['NEPAL_CAN_MOVE', 'PATHAO', 'MANUAL']),
  manualCourierName: z.string().optional(),
  manualTrackingNumber: z.string().optional(),
  manualTrackingUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const codSettlementSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  settlementReference: z.string().min(2, 'Settlement reference statement ID is required'),
});

export type DispatchOrderType = z.infer<typeof dispatchOrderSchema>;
export type CodSettlementType = z.infer<typeof codSettlementSchema>;

/**
 * Admin-editable delivery rate card.
 *
 * A band is half-open, [minWeightKg, maxWeightKg), so consecutive bands join
 * without overlapping and a parcel on a boundary belongs to the higher, more
 * expensive one. A weight with no band falls back to the platform flat fee rather
 * than being priced at zero.
 *
 * These bounds are refused rather than clamped. An admin who typed a band upside
 * down should be told, because the alternative is a gap in the card that quietly
 * charges a flat fee nobody chose.
 */

/** Above this the courier refuses the parcel outright, so we must not quote it. */
export const MAX_QUOTABLE_PARCEL_KG = 10;

/** Below this a threshold would waive delivery on any order at all. */
export const MIN_FREE_DELIVERY_THRESHOLD = 100;

const money = z
  .number()
  .finite()
  .nonnegative('Amount cannot be negative')
  .multipleOf(0.01, 'Amount cannot be finer than one paisa');

const weightKg = z.number().finite().nonnegative('Weight cannot be negative');

export const createShippingRateSchema = z
  .object({
    /** Null means the band applies to every city. */
    cityId: z.string().uuid('Invalid delivery city').nullable(),
    minWeightKg: weightKg,
    maxWeightKg: weightKg.max(MAX_QUOTABLE_PARCEL_KG, 'Cannot quote above 10 kg'),
    fee: money,
    /** Charged by the courier on collection, so it is a cost we absorb. */
    codFee: money.default(0),
    isActive: z.boolean().default(true),
  })
  .refine((rate) => rate.maxWeightKg > rate.minWeightKg, {
    message: 'Maximum weight must be greater than minimum weight',
    path: ['maxWeightKg'],
  });

// Strict: a typo'd field that is silently dropped leaves the admin believing
// they changed a price that never changed.
export const updateShippingRateSchema = z
  .object({
    cityId: z.string().uuid('Invalid delivery city').nullable().optional(),
    minWeightKg: weightKg.optional(),
    maxWeightKg: weightKg.max(MAX_QUOTABLE_PARCEL_KG, 'Cannot quote above 10 kg').optional(),
    fee: money.optional(),
    codFee: money.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (rate) =>
      rate.minWeightKg === undefined || rate.maxWeightKg === undefined
        ? true
        : rate.maxWeightKg > rate.minWeightKg,
    {
      message: 'Maximum weight must be greater than minimum weight',
      path: ['maxWeightKg'],
    },
  )
  .refine((rate) => Object.keys(rate).length > 0, { message: 'Nothing to update' });

export const updateDeliveryCitySchema = z
  .object({
    freeDeliveryThreshold: z
      .number()
      .finite()
      .int('Threshold must be a whole rupee amount')
      .min(MIN_FREE_DELIVERY_THRESHOLD, 'Threshold is too low to be meaningful')
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((city) => Object.keys(city).length > 0, { message: 'Nothing to update' });

export type CreateShippingRateType = z.infer<typeof createShippingRateSchema>;
export type UpdateShippingRateType = z.infer<typeof updateShippingRateSchema>;
export type UpdateDeliveryCityType = z.infer<typeof updateDeliveryCitySchema>;

/** Path params are validated rather than asserted, so a missing id is a 400. */
export const rateIdParamSchema = z.object({
  id: z.string().uuid('Invalid rate band ID'),
});
