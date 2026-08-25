import { memo } from 'react';

import type { ProductSidebarSection } from '../../types';
import ProductFormActions from '../product-form-action';

interface ProductFormActionsContainerProps {
  sections: ProductSidebarSection[];
  schemaReady: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  onSaveAsDraft: () => void;
  onCancel: () => void;
}

export const ProductFormActionsContainer = memo(
  ({
    sections,
    schemaReady,
    isDirty,
    isSubmitting,
    onSaveAsDraft,
    onCancel,
  }: ProductFormActionsContainerProps) => {
    const isReady =
      schemaReady && sections.length > 0 && sections.every((section) => section.status);
    return (
      <ProductFormActions
        isDirty={isDirty}
        isReady={isReady}
        onSaveAsDraft={onSaveAsDraft}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    );
  },
);
