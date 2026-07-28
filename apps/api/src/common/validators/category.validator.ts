import { z } from 'zod';
import { Types } from 'mongoose';
import {
  attributeSchema,
  createCategorySchema,
  updateCategorySchema,
  baseCategorySchema,
  CreateCategoryType,
  UpdateCategoryType,
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
export const categoryBaseSchema = baseCategorySchema;
export const categoryInputSchema = createCategorySchema;
export const categoryUpdateSchema = updateCategorySchema;

export type CategoryInput = CreateCategoryType;
export type CategoryUpdateInput = UpdateCategoryType;
