import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FieldErrors } from 'react-hook-form';
import { can, Permission } from '@celebs/rbac';
import { logger } from '@celebs/shared-utils';
import { Form } from '@celebs/shared-ui/components/form';
import { Button } from '@celebs/shared-ui/components/button';
import { Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/auth-provider';
import { createProduct, updateProduct, type CreateProductRequest } from '../../api';
import { useProductForm, type ProductFormValues } from '../../hooks/use-product-form';
import { useProductSchema } from '../../hooks/use-product-schema';
import { useProductDraft } from '../../hooks/use-product-draft';
import { useSubmissionState } from '../../hooks/use-submission-state';
import { extractVariantsMeta } from '../../fields/variant-utils';
import type { FieldSpec } from '../../types';
import BasicInfoSection from '../basic-info-section';
import { DynamicProductForm, type DynamicProductFormHandle } from '../dynamic-product-form';
import { SubmissionProgressChecklist } from '../submission-progress-checklist';
import { DraftAutoSaver } from './draft-autosaver';
import { DraftBanner } from './draft-banner';
import { ProductFormActionsContainer } from './form-actions-container';
import { autofillProductForm } from './dev-autofill';
import {
  MANAGE_PRODUCTS_PATH,
  normalizeText,
  uniqueMessages,
  isFieldFilled,
  resolvePageSectionKey,
} from '../../utils/add-product-helpers';
import { buildProductPayload } from '../../utils/add-product-payload';
import { focusFirstError, focusMissingField, formatFieldLabel } from '../../utils/form-focus';
import type { UseFormReturn } from 'react-hook-form';

// ─── Outer orchestrator: data hooks + provider boundary ──────────────────────
const AddProduct = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { toast } = useToast();
  const { role, user } = useAuthContext();
  const userId = user?.id || user?.email;

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
      description: 'Mock data loaded. Skips Cloudinary uploads.',
    });
  }, [form, schemaFields, toast]);

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
        draftRestored={draft.draftRestored}
        isEditMode={isEditMode}
        watchedCategoryId={watchedCategoryId}
        watchedSubcategoryId={watchedSubcategoryId}
        categoryPath={draft.categoryPath}
        getValues={form.getValues}
        userId={userId}
      />
      <AddProductFormBody
        productId={id}
        isEditMode={isEditMode}
        role={role}
        userPermissions={(user as { permissions?: string[] })?.permissions}
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
        onAutofill={handleAutofillClick}
      />
    </Form>
  );
};

// ─── Inner body: lives inside FormProvider so it can useSubmissionState ──────
interface AddProductFormBodyProps {
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
  onAutofill: () => void;
}

const AddProductFormBody = ({
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
  onAutofill,
}: AddProductFormBodyProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dynamicFormRef = useRef<DynamicProductFormHandle | null>(null);

  const { variants: variantMeta } = useMemo(
    () => extractVariantsMeta(schemaFields),
    [schemaFields],
  );

  // Single computation shared by checklist, action bar and the submit gate
  const { sections, completionPercentage, firstInvalidSection } = useSubmissionState({
    schemaFields,
    schemaHasName,
    variantMeta,
  });

  const schemaReady = schemaFields.length > 0;
  const effectiveCatId = watchedSubcategoryId || watchedCategoryId;
  // draftRestored gate prevents a schema fetch racing the draft restore
  const canShowAdditionalSections = Boolean(effectiveCatId && draft.draftRestored);

  const scrollToSection = useCallback((anchorId: string) => {
    if (anchorId !== 'product-section-basic' && dynamicFormRef.current?.scrollToSection(anchorId)) {
      return;
    }
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const applyServerErrors = useCallback(
    (error: unknown): string[] => {
      const errObj = error as
        | { data?: unknown; response?: { data?: { data?: unknown } } }
        | undefined;
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
        if (!message) return;
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
    },
    [form],
  );

  const handleSubmitProduct = async (status: CreateProductRequest['status']) => {
    if (!schemaReady) {
      toast({
        title: 'Form is still loading',
        description: 'Wait for the category-specific fields to finish loading before submitting.',
        variant: 'destructive',
      });
      return;
    }
    if (firstInvalidSection) {
      logger.warn({ section: firstInvalidSection }, 'Submit blocked by section validation');
      const focused = focusFirstError(form.formState.errors, firstInvalidSection.anchorId);

      // If RHF errors is empty, pinpoint missing dynamic/schema field in the section
      if (!focused && firstInvalidSection.anchorId) {
        const currentValues = form.getValues() as Record<string, unknown>;
        const sectionFields = schemaFields.filter(
          (f) => resolvePageSectionKey(f.name, schemaFields) === firstInvalidSection.key,
        );
        const missingField = sectionFields.find(
          (f) => f.required && f.visible !== false && !isFieldFilled(f, currentValues[f.name]),
        );

        if (missingField) {
          form.setError(missingField.name as unknown as `root.${string}`, {
            type: 'manual',
            message: `${missingField.label} is required`,
          });
          focusMissingField(missingField.name, firstInvalidSection.anchorId);
        } else {
          document
            .getElementById(firstInvalidSection.anchorId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      const label = focused ? formatFieldLabel(focused.path) : firstInvalidSection.label;
      const description = focused?.message || firstInvalidSection.errors[0] || firstInvalidSection.label;
      toast({
        title: `Complete: ${label}`,
        description,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentValues = form.getValues() as Record<string, unknown>;
      logger.info('Building payload for product submission...');
      const payload = await buildProductPayload({
        fields: schemaFields,
        status,
        values: currentValues,
      });
      logger.info({ payload }, 'Submitting product payload to API');

      if (isEditMode && productId) {
        await updateProduct(productId, payload);
        toast({
          title: 'Product updated',
          description: 'The product has been updated successfully.',
        });
      } else {
        await createProduct(payload);
        toast({
          title: 'Product created',
          description: 'The product has been created successfully.',
        });
      }

      draft.discardDraft();
      navigate(MANAGE_PRODUCTS_PATH);
    } catch (error: unknown) {
      logger.error({ error }, 'Submit Product API Error');
      const serverMessages = applyServerErrors(error);
      focusFirstError(form.formState.errors);
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
    logger.warn({ errors }, 'Form validation failed on submit');
    const focused = focusFirstError(errors, firstInvalidSection?.anchorId);
    const label = focused ? formatFieldLabel(focused.path) : firstInvalidSection?.label || 'Required Field';
    const message = focused?.message || firstInvalidSection?.errors[0] || 'Please complete all required fields.';
    toast({
      title: `Fix: ${label}`,
      description: message,
      variant: 'destructive',
    });
  };

  return (
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
                onClick={onAutofill}
                className="h-8 rounded-full border-orange-200 bg-orange-50/50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
              >
                Autofill Form
              </Button>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Complete the required catalog information, upload compliant media, and verify pricing
            before submitting the product.
          </p>
        </div>
      </div>

      {draft.restoredDraftAt ? (
        <DraftBanner restoredDraftAt={draft.restoredDraftAt} onDiscard={draft.discardDraft} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
        <div className="space-y-6">
          <form
            onSubmit={form.handleSubmit(
              () =>
                handleSubmitProduct(
                  can(role || 'STAFF', Permission.PRODUCT_PUBLISH, userPermissions)
                    ? 'published'
                    : 'pending_review',
                ),
              (errors) => handleFormInvalid(errors as FieldErrors<Record<string, unknown>>),
            )}
            className="space-y-6"
          >
            <section
              id="product-section-basic"
              className="scroll-mt-24 rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Basic Information
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Start with the category, name, brand, and description.The remaining sections adapt
                  to the chosen category.
                </p>
              </div>
              <BasicInfoSection
                control={form.control}
                selectedCategoryId={watchedCategoryId}
                selectedSubcategoryId={watchedSubcategoryId}
                onCategoryChange={onCategoryChange}
                onSubcategoryChange={onSubcategoryChange}
                onFieldChange={onBasicFieldChange}
                onCategoryPathChange={draft.setCategoryPath}
                categoryPath={draft.categoryPath}
                hideBrand={schemaHasBrand}
                hideName={schemaHasName}
              />
            </section>

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
                sections={sections}
                schemaReady={schemaReady}
                isDirty={form.formState.isDirty}
                isSubmitting={isSubmitting}
                onSaveAsDraft={draft.saveDraftNow}
                onCancel={() => navigate(MANAGE_PRODUCTS_PATH)}
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
              sections={sections}
              completionPercentage={completionPercentage}
              onSectionClick={scrollToSection}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              <p>Checklist appears once a category is chosen.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddProduct;
