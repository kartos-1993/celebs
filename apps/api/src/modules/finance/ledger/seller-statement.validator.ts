import { z } from 'zod';

/**
 * Request shapes for seller statements.
 *
 * Validation lives here rather than in the controller so the route reads as a
 * list of intentions and the arithmetic stays in the service.
 */

export const generateSellerStatementSchema = z
  .object({
    vendorId: z.string().uuid('Invalid vendor id').optional(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
  })
  .refine((body) => new Date(body.periodEnd) > new Date(body.periodStart), {
    message: 'Statement period must end after it starts',
    path: ['periodEnd'],
  });

export const listSellerStatementsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  vendorId: z.string().uuid('Invalid vendor id').optional(),
  status: z.enum(['DRAFT', 'LOCKED', 'APPROVED', 'PAID', 'VOID']).optional(),
});

export const statementIdParamSchema = z.object({
  id: z.string().uuid('Invalid seller statement id'),
});

export const paySellerStatementSchema = z.object({
  // What the bank or wallet says. Kept as a string because a transfer reference
  // is an identifier, not something to be arithmetically validated.
  payoutReference: z.string().trim().min(2).max(120),
});

export const voidSellerStatementSchema = z.object({
  notes: z.string().trim().min(2).max(500).optional(),
});

export type GenerateSellerStatementType = z.infer<typeof generateSellerStatementSchema>;
export type ListSellerStatementsType = z.infer<typeof listSellerStatementsSchema>;
export type PaySellerStatementType = z.infer<typeof paySellerStatementSchema>;
