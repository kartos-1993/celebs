import { useCallback, useMemo } from 'react';
import { useWatch } from 'react-hook-form';
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

type DraftUserScope = { vendorId?: string; storeId?: string };

export const AddProduct = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { role, user } = useAuthContext();
  const userId = user?.id || user?.email;
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

  const watchedCategoryId = String(useWatch({ control: form.control, name: 'categoryId' }) || '');
  const watchedSubcategoryId = String(
    useWatch({ control: form.control, name: 'subcategoryId' }) || '',
  );
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
        suppressAutosave={draft.isDraftAutosaveSuppressed}
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
