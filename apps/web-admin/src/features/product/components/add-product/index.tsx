import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { Form } from '@celebs/shared-ui/components/form';

import { useProductBarcodeModal } from '../../hooks/use-product-barcode-modal';
import { useProductDraft } from '../../hooks/use-product-draft';
import { useProductForm } from '../../hooks/use-product-form';
import { useProductSchema } from '../../hooks/use-product-schema';
import { BarcodePrintModal } from '../barcode/barcode-print-modal';
import {
  schemaDeclaresBrand,
  schemaDeclaresName,
  visibleFieldNames,
} from '../dynamic-form-helpers';

import { AddProductFormBody } from './add-product-form-body';
import { AddProductHeader } from './add-product-header';
import { autofillProductForm, notifyAutofillApplied } from './dev-autofill';
import { DraftAutoSaver } from './draft-autosaver';
import { DraftBanner } from './draft-banner';
import { syncDynamicTitleAndBrand } from './sync-dynamic-values';

import { PageLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';

/** `storeId` is served by some vendor payloads but is absent from `UserData`. */
type DraftUserScope = { vendorId?: string; storeId?: string };

// WONTFIX: renaming this `index.tsx` (FSD allows no barrel files) and folding the
// duplicated `effectiveCatId` derivation below into one helper are deliberate
// no-touches — the second owner is add-product-form-body.tsx, another stream's
// file. effective-cat-id.spec.ts pins both expressions byte-identical.
export const AddProduct = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { role, user } = useAuthContext();
  const userId = user?.id || user?.email;
  // Widen (no cast) so the optional `storeId` is readable on the signed-in user.
  const userScope: DraftUserScope | undefined = user;
  const storeId = userScope?.vendorId ?? userScope?.storeId;

  const {
    form,
    isLoading,
    categoryPath: productCategoryPath,
    product,
    updateBasicField,
    handleSubcategoryChange,
  } = useProductForm(id);

  const watchedCategoryId = String(form.watch('categoryId') || '');
  const watchedSubcategoryId = String(form.watch('subcategoryId') || '');
  const effectiveCatId = watchedSubcategoryId || watchedCategoryId;

  const {
    data: schemaFields = [],
    isLoading: isSchemaLoading,
    error: schemaError,
  } = useProductSchema(effectiveCatId, id);

  const visibleSchemaFieldNames = useMemo(() => visibleFieldNames(schemaFields), [schemaFields]);
  const schemaHasName = useMemo(() => schemaDeclaresName(schemaFields), [schemaFields]);
  const schemaHasBrand = useMemo(() => schemaDeclaresBrand(schemaFields), [schemaFields]);

  const draft = useProductDraft({
    form,
    userId,
    storeId,
    isEditMode,
    initialCategoryPath: productCategoryPath,
    visibleFieldNames: visibleSchemaFieldNames,
  });

  const barcode = useProductBarcodeModal(product, isEditMode);

  const handleDynamicValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      syncDynamicTitleAndBrand(form, values);
    },
    [form],
  );

  const handleAutofillClick = useCallback(() => {
    autofillProductForm(form, schemaFields);
    notifyAutofillApplied();
  }, [form, schemaFields]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Form {...form}>
      <DraftAutoSaver
        control={form.control}
        draftRestored={draft.draftRestored}
        isEditMode={isEditMode}
        watchedCategoryId={watchedCategoryId}
        watchedSubcategoryId={watchedSubcategoryId}
        categoryPath={draft.categoryPath}
        getValues={form.getValues}
        userId={userId}
        storeId={storeId}
      />

      <div className="space-y-6">
        <AddProductHeader
          isEditMode={isEditMode}
          onAutofill={handleAutofillClick}
          onPrintBarcodes={barcode.openModal}
        />

        {draft.restoredDraftAt ? (
          <DraftBanner restoredDraftAt={draft.restoredDraftAt} onDiscard={draft.discardDraft} />
        ) : null}

        <AddProductFormBody
          productId={id}
          isEditMode={isEditMode}
          role={role}
          userPermissions={user?.permissions}
          form={form}
          schemaFields={schemaFields}
          isSchemaLoading={isSchemaLoading}
          schemaError={schemaError}
          schemaHasName={schemaHasName}
          schemaHasBrand={schemaHasBrand}
          draft={draft}
          watchedCategoryId={watchedCategoryId}
          watchedSubcategoryId={watchedSubcategoryId}
          onCategoryChange={draft.resetForNewCategory}
          onSubcategoryChange={handleSubcategoryChange}
          onBasicFieldChange={updateBasicField}
          onDynamicValuesChange={handleDynamicValuesChange}
        />
      </div>

      {isEditMode && (
        <BarcodePrintModal
          isOpen={barcode.isOpen}
          onClose={barcode.closeModal}
          items={barcode.items}
        />
      )}
    </Form>
  );
};

export default AddProduct;
