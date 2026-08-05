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
