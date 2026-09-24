import type { UseFormReturn } from 'react-hook-form';

import { useProductDraft } from '../../hooks/use-product-draft';
import type { ProductFormValues } from '../../hooks/use-product-form';
import type { FieldSpec } from '../../types';

export interface AddProductFormBodyProps {
  productId?: string;
  isEditMode: boolean;
  role?: string;
  userPermissions?: string[];
  form: UseFormReturn<ProductFormValues>;
  schemaFields: FieldSpec[];
  isSchemaLoading: boolean;
  schemaError: Error | null;
  schemaHasName: boolean;
  schemaHasBrand: boolean;
  draft: ReturnType<typeof useProductDraft>;
  watchedCategoryId: string;
  watchedSubcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  onBasicFieldChange: (name: 'name' | 'brand' | 'description', value: string) => void;
  onDynamicValuesChange: (values: Record<string, unknown>) => void;
}
