import {
  attributeSchema,
  baseCategorySchema,
  CategoryAttributeType,
  CreateCategoryType,
} from '@celebs/shared-types';

export const attributeFormInputSchema = attributeSchema;
export const categoryFormSchema = baseCategorySchema;

export type AttributeFormInput = CategoryAttributeType;
export type CategoryFormData = CreateCategoryType;
