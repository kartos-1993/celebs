import {
  attributeSchema,
  createCategorySchema,
  CategoryAttributeType,
  CreateCategoryType,
} from '@celebs/shared-types';

export const attributeFormInputSchema = attributeSchema;
export const categoryFormSchema = createCategorySchema;

export type AttributeFormInput = CategoryAttributeType;
export type CategoryFormData = CreateCategoryType;

