import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { Form } from '@celebs/shared-ui/components/form';

import { useProductDraft } from '../../hooks/use-product-draft';
import { useProductForm } from '../../hooks/use-product-form';
import { useProductSchema } from '../../hooks/use-product-schema';

import { AddProductFormBody } from './add-product-form-body';
import { AddProductHeader } from './add-product-header';
import { autofillProductForm } from './dev-autofill';
import { DraftAutoSaver } from './draft-autosaver';
import { DraftBanner } from './draft-banner';

import { PageLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';

export const AddProduct = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { toast } = useToast();
  const { role, user } = useAuthContext();
  const userId = user?.id || user?.email;
  const storeId =
    (user as unknown as { vendorId?: string; storeId?: string })?.vendorId ??
    (user as unknown as { vendorId?: string; storeId?: string })?.storeId;

  const {
    form,
    isLoading,
    categoryPath: productCategoryPath,
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

  const draft = useProductDraft({
    form,
    userId,
    storeId,
    isEditMode,
    initialCategoryPath: productCategoryPath,
  });

  const schemaHasName = useMemo(() => {
    const names = new Set(schemaFields.map((field) => field.name.toLowerCase()));
    return names.has('name') || names.has('productname') || names.has('title');
  }, [schemaFields]);

  const schemaHasBrand = useMemo(() => {
    const names = new Set(schemaFields.map((field) => field.name.toLowerCase()));
    return names.has('brand') || names.has('productbrand');
  }, [schemaFields]);

  const handleDynamicValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      const normalized = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
      );
      const nameKey = ['name', 'productname', 'title'].find((key) => key in normalized);
      if (nameKey) {
        const newValue = String(normalized[nameKey] ?? '');
        if (form.getValues('name') !== newValue) {
          form.setValue('name', newValue, { shouldDirty: true, shouldValidate: true });
        }
      }
      const brandKey = ['brand', 'productbrand'].find((key) => key in normalized);
      if (brandKey) {
        const newValue = String(normalized[brandKey] ?? '');
        if (form.getValues('brand') !== newValue) {
          form.setValue('brand', newValue, { shouldDirty: true, shouldValidate: true });
        }
      }
    },
    [form],
  );

  const handleAutofillClick = useCallback(() => {
    autofillProductForm(form, schemaFields);
    toast({
      title: 'Form autofilled',
      description: 'Populated with sample values for testing.',
    });
  }, [form, schemaFields, toast]);

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
        <AddProductHeader isEditMode={isEditMode} onAutofill={handleAutofillClick} />

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
    </Form>
  );
};

export default AddProduct;
