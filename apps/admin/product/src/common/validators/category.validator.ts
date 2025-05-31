import { z } from 'zod';
import { Types } from 'mongoose';

// Zod schema for a Mongoose ObjectId (or null)
const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' })
  .transform((val) => new Types.ObjectId(val))
  .nullable();

// Zod schema for attribute values
const attributeValueSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  displayOrder: z.number().int().positive(),
});

// Zod schema for an attribute
const attributeInputSchema = z.object({
  name: z.string().min(1, 'Attribute name is required').trim(),
  type: z.enum(['text', 'select', 'multiselect', 'number', 'boolean'], {
    message: 'Invalid attribute type',
  }),
  values: z.array(attributeValueSchema),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().positive(),
  group: z.string().optional(),
});

// Zod schema for the category request body
export const categoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  parent: objectIdSchema.optional().default(null),
  displayOrder: z.number().int().positive().default(1),
  attributes: z.array(attributeInputSchema).optional().default([]),
});

// TypeScript type for the validated input
export type CategoryInput = z.infer<typeof categoryInputSchema>;
