import { memo } from 'react';

import { useSubmissionState } from '../../hooks/use-submission-state';
import type { FieldSpec, VariantMetaItem } from '../../types';
import ProductFormActions from '../product-form-action';

interface ProductFormActionsContainerProps {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<Pick<VariantMetaItem, 'key' | 'label'>>;
  schemaReady: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  isEditMode?: boolean;
  canPublish?: boolean;
  onSaveAsDraft: () => void;
  onCancel: () => void;
}

export const ProductFormActionsContainer = memo(
  ({
    schemaFields,
    schemaHasName,
    variantMeta,
    schemaReady,
    isDirty,
    isSubmitting,
    isEditMode = false,
    canPublish = false,
    onSaveAsDraft,
    onCancel,
  }: ProductFormActionsContainerProps) => {
    const { isReady } = useSubmissionState({
      schemaFields,
      schemaHasName,
      variantMeta,
    });

    return (
      <ProductFormActions
        isDirty={isDirty}
        isReady={schemaReady && isReady}
        onSaveAsDraft={onSaveAsDraft}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        canPublish={canPublish}
      />
    );
  },
);
