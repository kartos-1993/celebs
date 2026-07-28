import { z } from 'zod';
import { Types } from 'mongoose';
import {
  attributeSchema,
  createCategorySchema,
  updateCategorySchema,
  CreateCategoryType,
} from '@celebs/shared-types';

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

export const attributeInputSchema = attributeSchema;
export const categoryBaseSchema = createCategorySchema;
export const categoryInputSchema = createCategorySchema;
export const categoryUpdateSchema = updateCategorySchema;

export type CategoryInput = CreateCategoryType;
