import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Form } from '@celebs/shared-ui/components/form';
import { Button } from '@celebs/shared-ui/components/button';
import { useToast } from '@/hooks/use-toast';
import { FileClock, Info, RotateCcw } from 'lucide-react';
import { useAuthContext } from '@/context/auth-provider';
import { CreateProductRequest, ProductApiService } from '../api';
import { useProductForm } from '../hooks/useProductForm';
import type { FieldSpec } from '../fields/UiRegistry';
import { extractVariantsMeta } from '../fields/variant-utils';
import BasicInfoSection from './basic-info-section';
import DynamicProductForm from './dynamic-product-form';
import ProductFormActions from './product-form-action';
import SubmissionProgressChecklist from './submission-progress-checklist';
import {
  MANAGE_PRODUCTS_PATH,
  flattenObject,
  getDraftStorageKey,
  normalizeText,
  serializeDraftValue,
  uniqueMessages,
} from '../utils/add-product-helpers';
import {
  buildSidebarSections,
  flattenFormErrors,
} from '../utils/add-product-validation';
import { buildProductPayload } from '../utils/add-product-payload';

const DraftAutoSaver = memo(({
  control,
  draftRestored,
  isEditMode,
  watchedCategoryId,
  watchedSubcategoryId,
  categoryPath,
  getValues,
  userId,
}: {
  control: any;
  draftRestored: boolean;
  isEditMode: boolean;
  watchedCategoryId: string;
  watchedSubcategoryId: string;
  categoryPath: string[] | undefined;
  getValues: () => Record<string, unknown>;
  userId?: string;
}) => {
  const watchedFormValues = useWatch({ control });

  useEffect(() => {
    if (!draftRestored || isEditMode || !watchedCategoryId || !watchedSubcategoryId) {
      return;
    }
    const timer = setTimeout(() => {
      const values = getValues();
      if (values.categoryId && values.subcategoryId) {
        window.localStorage.setItem(
          getDraftStorageKey(userId),
          JSON.stringify({
            categoryPath,
            savedAt: new Date().toISOString(),
            values: serializeDraftValue(values),
          }),
        );
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [draftRestored, watchedFormValues, categoryPath, isEditMode, watchedCategoryId, watchedSubcategoryId, getValues, userId]);

  return null;
});

const ProductFormActionsContainer = memo(({
  schemaFields,
  schemaHasName,
  variantMeta,
  onSaveAsDraft,
  onCancel,
  isSubmitting,
  isDirty,
  schemaReady,
}: {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<{ key: string; label: string }>;
  onSaveAsDraft: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isDirty: boolean;
  schemaReady: boolean;
}) => {
  const { control, formState: { errors } } = useFormContext();
  const formValues = useWatch({ control }) as Record<string, unknown>;
  const fieldErrors = useMemo(() => flattenFormErrors(errors), [errors]);

  const sidebarSections = useMemo(
    () =>
      buildSidebarSections({
        fieldErrors,
        schemaFields,
        schemaHasName,
        values: formValues,
        variantMeta: variantMeta.map((variant) => ({
          key: variant.key,
          label: variant.label,
        })),
      }),
    [fieldErrors, formValues, schemaFields, schemaHasName, variantMeta],
  );

  const isReady = schemaReady && sidebarSections.every((section) => section.status);

  return (
    <ProductFormActions
      isDirty={isDirty}
      isReady={isReady}
      onSaveAsDraft={onSaveAsDraft}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
    />
  );
});

const AddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const { toast } = useToast();
  const { role, user } = useAuthContext();
  const userId = user?.id || user?.email;

  const [categoryPath, setCategoryPath] = useState<string[] | undefined>();
  const [schemaFields, setSchemaFields] = useState<FieldSpec[]>([]);
  const [schemaHasBrand, setSchemaHasBrand] = useState(false);
  const [schemaHasName, setSchemaHasName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);

  const { form, isLoading, updateBasicField, handleSubcategoryChange } =
    useProductForm(id);

  const watchedCategoryId = String(form.watch('categoryId') || '');
  const watchedSubcategoryId = String(form.watch('subcategoryId') || '');

  const { variants: variantMeta } = useMemo(
    () => extractVariantsMeta(schemaFields),
    [schemaFields],
  );

  const handleDiscardDraft = useCallback(() => {
    const draftKey = getDraftStorageKey(userId);
    window.localStorage.removeItem(draftKey);

    form.reset({
      name: '',
      brand: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      status: 'draft',
    });

    setCategoryPath(undefined);
    setSchemaFields([]);
    setSchemaHasBrand(false);
    setSchemaHasName(false);
    setRestoredDraftAt(null);
    form.clearErrors();

    toast({
      title: 'Draft Discarded',
      description: 'Cleared saved draft. Starting a fresh product entry.',
    });
  }, [form, userId, toast]);

  const handleAutofill = () => {
    form.setValue('name', "Manfinity Hypemode Men's Solid Ribbed Long Sleeve Polo Shirt, Old Money Style", { shouldValidate: true });
    form.setValue('description', "High-quality ribbed knit polo shirt featuring a soft cotton blend, clean button placket, and classic tailoring. Highly breathable, perfect for styling in formal, transition, or casual settings.", { shouldValidate: true });
    form.setValue('brand', 'Manfinity', { shouldValidate: true });

    form.setValue('mainImage', [
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941142/celebs/products/bln3u0xtadrgtioonfsn.png',
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941153/celebs/products/dy4aw7qrlnj3uzglqbk5.png'
    ], { shouldValidate: true });

    schemaFields.forEach(field => {
      if (['name', 'brand', 'description', 'categoryId', 'subcategoryId', 'mainImage'].includes(field.name)) {
        return;
      }

      const ui = field.uiType.toLowerCase();
      if (ui === 'input' || ui === 'text') {
        form.setValue(field.name, 'Premium Cotton Blend', { shouldValidate: true });
      } else if (ui === 'number') {
        form.setValue(field.name, 12, { shouldValidate: true });
      } else if (ui === 'switch') {
        form.setValue(field.name, true, { shouldValidate: true });
      } else if (ui === 'select') {
        const firstOpt = Array.isArray(field.dataSource) ? field.dataSource[0]?.value : undefined;
        if (firstOpt) {
          form.setValue(field.name, firstOpt, { shouldValidate: true });
        }
      } else if (ui === 'multiselect') {
        const opts = Array.isArray(field.dataSource)
          ? field.dataSource.slice(0, 2).map((o) => (o as { value?: string }).value)
          : [];
        form.setValue(field.name, opts, { shouldValidate: true });
      } else if (ui === 'variantlist') {
        const opts = Array.isArray(field.dataSource)
          ? field.dataSource.slice(0, 2).map((o) => (o as { value?: string }).value)
          : ['Blue', 'White'];
        form.setValue(field.name, opts, { shouldValidate: true });
      }
    });

    form.setValue('sku.default.price' as any, '1200', { shouldValidate: true });
    form.setValue('sku.default.stock' as any, '15', { shouldValidate: true });
    form.setValue('sku.default.sellerSku' as any, 'POLO-SHIRT-MOCK', { shouldValidate: true });
    form.setValue('sku.default.available' as any, true, { shouldValidate: true });

    const colors = (form.getValues('Color' as any) as string[] | undefined) || ['Blue', 'White'];
    if (Array.isArray(colors)) {
      colors.forEach((color) => {
        const prefix = `variants.colorMeta.${color}`;
        form.setValue(`${prefix}.hot` as any, false);
        form.setValue(`${prefix}.swatch` as any, 'https://res.cloudinary.com/celebsnp/image/upload/v1783941189/celebs/products/qrxlasu3b8wercsjciod.png');
        form.setValue(`${prefix}.images` as any, [
          'https://res.cloudinary.com/celebsnp/image/upload/v1783941201/celebs/products/okt4fj4pzwhwqgidijnf.png',
          'https://res.cloudinary.com/celebsnp/image/upload/v1783941232/celebs/products/t4qusgbfbeg2klkkckaf.png',
        ]);
      });
    }

    const currentSizes = (form.getValues('sizes' as any) as Array<{
      name?: string;
      productMeasurements?: Array<{ name?: string; value?: string }>;
      bodyMeasurements?: Array<{ name?: string; value?: string }>;
    }>) || [];

    if (Array.isArray(currentSizes)) {
      const updated = currentSizes.map((sizeObj) => {
        const populateList = (list?: Array<{ name?: string; value?: string }>) => {
          return (list || []).map((m) => ({ ...m, value: '45.5' }));
        };
        return {
          ...sizeObj,
          productMeasurements: populateList(sizeObj.productMeasurements),
          bodyMeasurements: populateList(sizeObj.bodyMeasurements),
        };
      });
      form.setValue('sizes' as any, updated, { shouldValidate: true });
    }

    toast({
      title: "Form Autofilled",
      description: "Mock data loaded. Skips Cloudinary uploads.",
    });
  };

  // 1. Track whether initial draft restoration has finished
  const [draftRestored, setDraftRestored] = useState(false);

  // 1. Restore draft on mount & re-bind values when dynamic schema fields finish loading
  useEffect(() => {
    if (isEditMode) {
      setDraftRestored(true);
      return;
    }

    const draftKey = getDraftStorageKey(userId);
    const rawDraft = window.localStorage.getItem(draftKey);
    if (!rawDraft) {
      setDraftRestored(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as {
        categoryPath?: string[];
        savedAt?: string;
        values?: Record<string, unknown>;
      };

      if (Array.isArray(draft.categoryPath)) {
        setCategoryPath(draft.categoryPath);
      }

      if (draft.savedAt) {
        setRestoredDraftAt(draft.savedAt);
      }

      if (draft.values) {
        const valObj = draft.values as Record<string, any>;
        const flatVals = flattenObject(valObj);

        // Ensure categoryId and subcategoryId are set first
        if (valObj.categoryId && !form.getValues('categoryId')) {
          form.setValue('categoryId', valObj.categoryId, { shouldValidate: true });
        }
        if (valObj.subcategoryId && !form.getValues('subcategoryId')) {
          form.setValue('subcategoryId', valObj.subcategoryId, { shouldValidate: true });
        }

        // Full reset with all saved values
        form.reset({
          ...form.getValues(),
          ...valObj,
          ...flatVals,
          status: 'draft',
        });

        // Batch set values across all fields
        Object.entries({ ...valObj, ...flatVals }).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            form.setValue(key as any, val, { shouldDirty: true, shouldValidate: false });
          }
        });
      }
    } catch (err) {
      console.error('Failed to restore draft:', err);
      // Don't wipe storage on transient JSON parse errors during HMR
    } finally {
      setDraftRestored(true);
    }
  }, [form, isEditMode, schemaFields.length, userId]);

  // 2. Auto-save form state is handled by isolated DraftAutoSaver sub-component below

  const canShowAdditionalSections = Boolean(
    watchedCategoryId && watchedSubcategoryId,
  );
  const schemaReady = schemaFields.length > 0;

  const scrollToSection = (anchorId: string) => {
    document
      .getElementById(anchorId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearDynamicState = (categoryId: string) => {
    // 1. Remove saved local draft for current user to prevent lingering data
    const draftKey = getDraftStorageKey(userId);
    window.localStorage.removeItem(draftKey);

    // 2. Complete form reset to clean default values for the new category
    form.reset({
      name: '',
      brand: '',
      description: '',
      categoryId,
      subcategoryId: categoryId,
      status: 'draft',
      mainImage: [],
      sku: {
        default: {
          price: '',
          stock: '',
          sellerSku: '',
          available: true,
        },
      },
    });

    // 3. Clear dynamic schema & draft states
    setCategoryPath(undefined);
    setSchemaFields([]);
    setSchemaHasBrand(false);
    setSchemaHasName(false);
    setRestoredDraftAt(null);
    form.clearErrors();
  };

  const handleCategoryChange = (categoryId: string) => {
    clearDynamicState(categoryId);
  };

  const handleDynamicValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      const normalizedEntries = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      );

      const nameKey = ['name', 'productname', 'title'].find(
        (key) => key in normalizedEntries,
      );
      if (nameKey) {
        const newValue = String(normalizedEntries[nameKey] ?? '');
        if (form.getValues('name') !== newValue) {
          form.setValue('name', newValue, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }

      const brandKey = ['brand', 'productbrand'].find(
        (key) => key in normalizedEntries,
      );
      if (brandKey) {
        const newValue = String(normalizedEntries[brandKey] ?? '');
        if (form.getValues('brand') !== newValue) {
          form.setValue('brand', newValue, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    },
    [form],
  );

  const handleSchemaLoaded = useCallback((fields: FieldSpec[]) => {
    setSchemaFields(fields);
    const names = new Set(fields.map((field) => field.name.toLowerCase()));

    setSchemaHasName(
      names.has('name') || names.has('productname') || names.has('title'),
    );
    setSchemaHasBrand(names.has('brand') || names.has('productbrand'));
  }, []);

  const handleSaveAsDraft = () => {
    const draftKey = getDraftStorageKey(userId);
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        categoryPath,
        savedAt: new Date().toISOString(),
        values: serializeDraftValue(form.getValues()),
      }),
    );

    form.reset(form.getValues());
    setRestoredDraftAt(new Date().toISOString());

    toast({
      title: 'Draft saved locally',
      description:
        'Text, category, and pricing fields were saved locally for your account.',
    });
  };

  const applyServerErrors = (error: unknown): string[] => {
    const errObj = error as { data?: unknown; response?: { data?: { data?: unknown } } } | undefined;
    const apiErrors = Array.isArray(errObj?.data)
      ? errObj.data
      : Array.isArray(errObj?.response?.data?.data)
        ? errObj.response.data.data
        : [];

    const unmappedMessages: string[] = [];

    apiErrors.forEach((entry: unknown) => {
      const item = entry as { field?: string; path?: string; message?: string } | undefined;
      const path = normalizeText(item?.field || item?.path);
      const message = normalizeText(item?.message);

      if (!message) {
        return;
      }

      if (path) {
        form.setError(path as unknown as keyof typeof form.getValues, {
          type: 'server',
          message,
        });
      } else {
        unmappedMessages.push(message);
      }
    });

    return uniqueMessages(unmappedMessages);
  };

  const handleSubmitProduct = async (
    status: CreateProductRequest['status'],
  ) => {
    if (!schemaReady) {
      toast({
        title: 'Form is still loading',
        description:
          'Wait for the category-specific fields to finish loading before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const currentValues = form.getValues() as Record<string, unknown>;
    const currentSections = buildSidebarSections({
      fieldErrors: flattenFormErrors(form.formState.errors),
      schemaFields,
      schemaHasName,
      values: currentValues,
      variantMeta: variantMeta.map((variant) => ({
        key: variant.key,
        label: variant.label,
      })),
    });
    const firstInvalidSection = currentSections.find(
      (section) => !section.status,
    );

    if (firstInvalidSection) {
      console.warn('Submit blocked by section validation:', firstInvalidSection);
      scrollToSection(firstInvalidSection.anchorId);
      toast({
        title: 'Complete the required sections',
        description: firstInvalidSection.errors[0] || firstInvalidSection.label,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Building payload for product submission...');
      const payload = await buildProductPayload({
        fields: schemaFields,
        status,
        values: currentValues,
      });

      console.log('Submitting product payload to API:', payload);

      if (isEditMode && id) {
        await ProductApiService.updateProduct(id, payload);
        toast({
          title: 'Product updated',
          description: 'The product has been updated successfully.',
        });
      } else {
        await ProductApiService.createProduct(payload);
        toast({
          title: 'Product created',
          description: 'The product has been created successfully.',
        });
      }

      const draftKey = getDraftStorageKey(userId);
      window.localStorage.removeItem(draftKey);
      setRestoredDraftAt(null);
      form.reset(form.getValues());

      navigate(MANAGE_PRODUCTS_PATH);
    } catch (error: unknown) {
      console.error('Submit Product API Error:', error);
      const serverMessages = applyServerErrors(error);

      toast({
        title: 'Unable to save product',
        description:
          serverMessages[0] ||
          (error as Error)?.message ||
          'Review the highlighted fields and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormInvalid = (errors: FieldErrors<Record<string, unknown>>) => {
    console.warn('Form validation failed on submit:', errors);
    const flatErrs = flattenFormErrors(errors);
    const sections = buildSidebarSections({
      fieldErrors: flatErrs,
      schemaFields,
      schemaHasName,
      values: form.getValues() as Record<string, unknown>,
      variantMeta: variantMeta.map((variant) => ({
        key: variant.key,
        label: variant.label,
      })),
    });
    const firstInvalidSection = sections.find((section) => !section.status);

    if (firstInvalidSection) {
      scrollToSection(firstInvalidSection.anchorId);
      toast({
        title: 'Fix the highlighted fields',
        description: firstInvalidSection.errors[0] || firstInvalidSection.label,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Fix highlighted fields',
        description: flatErrs[0]?.message || 'Please verify all required fields before submitting.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-zinc-50 dark:bg-zinc-950">
        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Loading product form...
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <DraftAutoSaver
        control={form.control}
        draftRestored={draftRestored}
        isEditMode={isEditMode}
        watchedCategoryId={watchedCategoryId}
        watchedSubcategoryId={watchedSubcategoryId}
        categoryPath={categoryPath}
        getValues={form.getValues}
        userId={userId}
      />
      <div className="space-y-6">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                  {isEditMode ? 'Update Product' : 'Create a new product listing'}
                </h1>
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutofill}
                    className="h-8 rounded-full border-orange-200 bg-orange-50/50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
                  >
                    Autofill Form
                  </Button>
                )}
              </div>
              <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                Complete the required catalog information, upload compliant
                media, and verify pricing before submitting the product.
              </p>
            </div>
          </div>

          {restoredDraftAt ? (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <FileClock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                <div>
                  <p className="font-semibold text-xs text-amber-900 dark:text-amber-100">
                    Saved draft auto-restored
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                    Loaded unfinished draft saved on{' '}
                    {new Date(restoredDraftAt).toLocaleString()}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardDraft}
                  className="h-8 rounded-xl border-amber-300 bg-white/90 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/80"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                  Discard Draft & Start Fresh
                </Button>
              </div>
            </div>
          ) : null}

          {/* Ultra-compact 190px sidebar column to maximize main form & SKU table width */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
            <div className="space-y-6">
              <form
                onSubmit={form.handleSubmit(
                  () => {
                    return handleSubmitProduct(role === 'VENDOR' ? 'pending_review' : 'published');
                  },
                  (errors) => {
                    handleFormInvalid(errors as FieldErrors<Record<string, unknown>>);
                  },
                )}
                className="space-y-6"
              >
                <section
                  id="product-section-basic"
                  className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8"
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      Basic Information
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                      Start with the category, name, brand, and description. The
                      remaining sections adapt to the chosen category.
                    </p>
                  </div>

                  <BasicInfoSection
                    control={form.control}
                    selectedCategoryId={watchedCategoryId}
                    selectedSubcategoryId={watchedSubcategoryId}
                    onCategoryChange={handleCategoryChange}
                    onSubcategoryChange={handleSubcategoryChange}
                    onFieldChange={updateBasicField}
                    onCategoryPathChange={setCategoryPath}
                    categoryPath={categoryPath}
                    hideBrand={schemaHasBrand}
                    hideName={schemaHasName}
                  />
                </section>

                {canShowAdditionalSections ? (
                  <DynamicProductForm
                    key={watchedSubcategoryId}
                    catId={watchedSubcategoryId}
                    productId={id}
                    onValuesChange={handleDynamicValuesChange}
                    onSchemaLoaded={handleSchemaLoaded}
                  />
                ) : null}

                {canShowAdditionalSections ? (
                  <ProductFormActionsContainer
                    isDirty={form.formState.isDirty}
                    schemaReady={schemaReady}
                    schemaFields={schemaFields}
                    schemaHasName={schemaHasName}
                    variantMeta={variantMeta}
                    onSaveAsDraft={handleSaveAsDraft}
                    onCancel={() => navigate(MANAGE_PRODUCTS_PATH)}
                    isSubmitting={isSubmitting}
                  />
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                    Select a category to unlock specifications, pricing, and shipping.
                  </div>
                )}
              </form>
            </div>

            {canShowAdditionalSections ? (
              <div className="lg:sticky lg:top-6 lg:self-start">
                <SubmissionProgressChecklist
                  schemaFields={schemaFields}
                  schemaHasName={schemaHasName}
                  variantMeta={variantMeta}
                  onSectionClick={scrollToSection}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                <div className="flex items-start gap-2.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                  <p>
                    Checklist appears once a category is chosen.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Form>
  );
};

export default AddProduct;
