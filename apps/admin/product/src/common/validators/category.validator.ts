import { z } from 'zod';
import { Types } from 'mongoose';

// Zod schema for a Mongoose ObjectId (or null)
const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' })
  .transform((val) => new Types.ObjectId(val))
  .nullable();

// Export idSchema for use in other validators
export const idSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

// Zod schema for attribute values
const attributeValueSchema = z.string().min(1, 'Value is required');

// Zod schema for an attribute
export const attributeInputSchema = z
  .object({
  name: z.string().min(1, 'Attribute name is required').trim(),
  type: z.enum(['text', 'select', 'multiselect', 'number', 'boolean'], {
    message: 'Invalid attribute type',
  }),
  values: z.array(attributeValueSchema).optional().default([]),
  isRequired: z.boolean().default(false),
  group: z.string().optional(),
  // NEW: variant + option set support
  isVariant: z.boolean().optional().default(false),
  // prefer variantType; accept variantAxis for backward compatibility
  variantType: z.enum(['color', 'size']).optional().nullable(),
  variantAxis: z.enum(['color', 'size']).optional().nullable(),
  useStandardOptions: z.boolean().optional().default(false),
  optionSetId: objectIdSchema.optional().default(null),
  })
  // normalize variantAxis -> variantType
  .transform((val) => {
    const variantType = (val as any).variantType ?? (val as any).variantAxis ?? null;
    const { variantAxis, ...rest } = val as any;
    return { ...rest, variantType } as any;
  });

// Base schema (no refinements) for reuse (e.g., in updates with .partial())
export const categoryBaseSchema = z
  .object({
    name: z.string().min(1, 'Name is required').trim(),
    parent: objectIdSchema.optional().default(null),
    attributes: z.array(attributeInputSchema).optional().default([]),
  });

// Zod schema for the category request body
export const categoryInputSchema = categoryBaseSchema
  .refine((val) => {
    const attrs = val.attributes || [];
    const axes = attrs
      .filter((a: any) => a.isVariant && (a.variantType ?? a.variantAxis))
      .map((a: any) => a.variantType ?? a.variantAxis);
    const unique = new Set(axes);
    return unique.size <= 2;
  }, {
    message: 'You can select at most two distinct variation types (e.g., Color and Size)',
    path: ['attributes'],
  });

// TypeScript type for the validated input
export type CategoryInput = z.infer<typeof categoryInputSchema>;
