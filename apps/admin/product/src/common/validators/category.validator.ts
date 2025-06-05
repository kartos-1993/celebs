import { z } from 'zod';
import { Types } from 'mongoose';

// Zod schema for a Mongoose ObjectId (or null)
const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' })
  .transform((val) => new Types.ObjectId(val))
  .nullable();

// Zod schema for attribute values
const attributeValueSchema = z.string().min(1, 'Value is required');

// Zod schema for an attribute
const attributeInputSchema = z.object({
  name: z.string().min(1, 'Attribute name is required').trim(),
  type: z.enum(['text', 'select', 'multiselect', 'number', 'boolean'], {
    message: 'Invalid attribute type',
  }),
  values: z.array(attributeValueSchema),
  isRequired: z.boolean().default(false),
  group: z.string().optional(),
});

// Zod schema for the category request body
export const categoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  parent: objectIdSchema.optional().default(null),

  attributes: z.array(attributeInputSchema).optional().default([]),
});

// TypeScript type for the validated input
export type CategoryInput = z.infer<typeof categoryInputSchema>;
