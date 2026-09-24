import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { can, Permission } from '@celebs/rbac';

import { extractVariantsMeta } from '../../fields/variant-utils';
import { MANAGE_PRODUCTS_PATH } from '../../utils/add-product-helpers';
import { DynamicProductForm, type DynamicProductFormHandle } from '../dynamic-product-form';

import { AddProductBasicSection } from './add-product-basic-section';
import type { AddProductFormBodyProps } from './add-product-form-body-types';
import { ProductFormActionsContainer } from './form-actions-container';
import { ProductSubmissionSidebar } from './product-submission-sidebar';
import { useAddProductSubmit } from './use-add-product-submit';

export { type AddProductFormBodyProps } from './add-product-form-body-types';

export const AddProductFormBody = ({
  productId,
  isEditMode,
  role,
  userPermissions,
  form,
  schemaFields,
  isSchemaLoading,
  schemaError,
  schemaHasName,
  schemaHasBrand,
  draft,
  watchedCategoryId,
  watchedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  onBasicFieldChange,
  onDynamicValuesChange,
}: AddProductFormBodyProps) => {
  const navigate = useNavigate();
  const dynamicFormRef = useRef<DynamicProductFormHandle | null>(null);

  const { variants: variantMeta } = useMemo(
    () => extractVariantsMeta(schemaFields),
    [schemaFields],
  );

  const schemaReady = schemaFields.length > 0;
  const effectiveCatId = watchedSubcategoryId || watchedCategoryId;
  const canShowAdditionalSections = Boolean(effectiveCatId && draft.draftRestored);

  const scrollToSection = useCallback((anchorId: string) => {
    if (anchorId !== 'product-section-basic' && dynamicFormRef.current?.scrollToSection(anchorId)) {
      return;
    }
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const { isSubmitting, handleSubmitProduct, handleFormInvalid } = useAddProductSubmit({
    form,
    schemaFields,
    schemaHasName,
    variantMeta,
    draft,
    productId,
    isEditMode,
  });

  const canPublish = can(role || 'STAFF', Permission.PRODUCT_PUBLISH, userPermissions);
  const isCategoryLocked = isEditMode && form.getValues('status') === 'published';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
      <div className="space-y-6">
        <form
          noValidate
          onSubmit={form.handleSubmit(
            () => handleSubmitProduct(canPublish ? 'published' : 'pending_review'),
            handleFormInvalid,
          )}
          className="space-y-6"
        >
          <AddProductBasicSection
            control={form.control}
            watchedCategoryId={watchedCategoryId}
            watchedSubcategoryId={watchedSubcategoryId}
            onCategoryChange={onCategoryChange}
            onSubcategoryChange={onSubcategoryChange}
            onBasicFieldChange={onBasicFieldChange}
            onCategoryPathChange={draft.setCategoryPath}
            categoryPath={draft.categoryPath}
            hideBrand={schemaHasBrand}
            hideName={schemaHasName}
            isCategoryLocked={isCategoryLocked}
          />

          {canShowAdditionalSections ? (
            <DynamicProductForm
              key={effectiveCatId}
              ref={dynamicFormRef}
              catId={effectiveCatId}
              schemaFields={schemaFields}
              isSchemaLoading={isSchemaLoading}
              schemaError={schemaError}
              onValuesChange={onDynamicValuesChange}
            />
          ) : null}

          {canShowAdditionalSections ? (
            <ProductFormActionsContainer
              schemaFields={schemaFields}
              schemaHasName={schemaHasName}
              variantMeta={variantMeta}
              schemaReady={schemaReady}
              isDirty={form.formState.isDirty}
              isSubmitting={isSubmitting}
              isEditMode={isEditMode}
              canPublish={canPublish}
              onSaveAsDraft={draft.saveDraftNow}
              onCancel={() => navigate(MANAGE_PRODUCTS_PATH)}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/80 px-6 py-5 text-sm text-muted-foreground">
              Select a category to unlock specifications, pricing, and shipping.
            </div>
          )}
        </form>
      </div>

      {canShowAdditionalSections ? (
        <ProductSubmissionSidebar
          schemaFields={schemaFields}
          schemaHasName={schemaHasName}
          variantMeta={variantMeta}
          onSectionClick={scrollToSection}
        />
      ) : null}
    </div>
  );
};
