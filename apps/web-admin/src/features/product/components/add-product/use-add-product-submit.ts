import { useCallback, useState } from 'react';
import type { FieldErrors, Path, UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { logger } from '@celebs/shared-utils';

import { useProductDraft } from '../../hooks/use-product-draft';
import type { ProductFormValues } from '../../hooks/use-product-form';
import { useProductMutations } from '../../hooks/use-product-queries';
import type { CreateProductRequest, FieldSpec } from '../../types';
import {
  isFieldFilled,
  MANAGE_PRODUCTS_PATH,
  normalizeText,
  resolvePageSectionKey,
  uniqueMessages,
} from '../../utils/add-product-helpers';
import { buildProductPayload } from '../../utils/add-product-payload';
import { buildSidebarSections, flattenFormErrors } from '../../utils/add-product-validation';
import { focusFirstError, focusMissingField } from '../../utils/form-focus';

import { useToast } from '@/hooks/use-toast';

interface UseAddProductSubmitOptions {
  form: UseFormReturn<ProductFormValues>;
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<{ key: string; label: string }>;
  draft: ReturnType<typeof useProductDraft>;
  productId?: string;
  isEditMode: boolean;
}

export function useAddProductSubmit({
  form,
  schemaFields,
  schemaHasName,
  variantMeta,
  draft,
  productId,
  isEditMode,
}: UseAddProductSubmitOptions) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { create, update } = useProductMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyServerErrors = useCallback(
    (error: unknown): { messages: string[]; firstPath?: string } => {
      const errObj = error as
        | {
            errors?: unknown;
            message?: unknown;
            data?: unknown;
            response?: { data?: { errors?: unknown; data?: unknown } };
          }
        | undefined;
      const rawErrors =
        errObj?.errors ??
        errObj?.response?.data?.errors ??
        errObj?.data ??
        errObj?.response?.data?.data;
      const apiErrors = Array.isArray(rawErrors) ? rawErrors : [];
      const unmappedMessages: string[] = [];
      let firstPath: string | undefined;

      apiErrors.forEach((entry: unknown) => {
        const item = entry as { field?: string; path?: string; message?: string } | undefined;
        const path = normalizeText(item?.field || item?.path);
        const message = normalizeText(item?.message);
        if (!message) return;
        if (path) {
          form.setError(path as Path<ProductFormValues>, { type: 'server', message });
          if (!firstPath) firstPath = path;
        } else {
          unmappedMessages.push(message);
        }
      });
      return { messages: uniqueMessages(unmappedMessages), firstPath };
    },
    [form],
  );

  const handleSubmitProduct = async (status: CreateProductRequest['status']) => {
    if (schemaFields.length === 0) {
      toast({
        title: 'Form is still loading',
        description: 'Wait for the category-specific fields to finish loading before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const currentValues = form.getValues() as Record<string, unknown>;
    const currentErrors = flattenFormErrors(form.formState.errors);
    const activeSections = buildSidebarSections({
      fieldErrors: currentErrors,
      schemaFields,
      schemaHasName,
      values: currentValues,
      variantMeta,
    });
    const firstInvalidSection = activeSections.find((section) => !section.status);

    if (firstInvalidSection) {
      logger.warn({ section: firstInvalidSection }, 'Submit blocked by section validation');
      if (firstInvalidSection.key === 'pricing' && variantMeta.length > 2) {
        const extras = variantMeta.slice(2);
        for (const extra of extras) {
          form.setError(extra.key as Path<ProductFormValues>, {
            type: 'manual',
            message: `Clear ${extra.label} values — the pricing matrix supports two variant groups`,
          });
        }
        focusMissingField(extras[0].key, 'product-section-variant');
        return;
      }

      const focused = focusFirstError(form.formState.errors, firstInvalidSection.anchorId);
      if (!focused && firstInvalidSection.anchorId) {
        const sectionFields = schemaFields.filter(
          (f) => resolvePageSectionKey(f.name, schemaFields) === firstInvalidSection.key,
        );
        const missingField = sectionFields.find(
          (f) => f.required && f.visible !== false && !isFieldFilled(f, currentValues[f.name]),
        );
        if (missingField) {
          form.setError(missingField.name as Path<ProductFormValues>, {
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
      return;
    }

    setIsSubmitting(true);
    try {
      logger.info('Building payload for product submission...');
      const payload = await buildProductPayload({
        fields: schemaFields,
        status,
        values: currentValues,
        isUpdate: isEditMode,
      });

      if (isEditMode && productId) {
        await update.mutateAsync({ id: productId, payload });
        toast({
          title: 'Product updated',
          description: 'The product has been updated successfully.',
        });
      } else {
        await create.mutateAsync(payload);
        toast({
          title: 'Product created',
          description: 'The product has been created successfully.',
        });
      }

      // Clear stored draft from storage without resetting active form inputs
      draft.clearSavedDraft();

      // Immediately navigate without flashing an empty form
      navigate(MANAGE_PRODUCTS_PATH, { replace: true });
    } catch (error: unknown) {
      logger.error({ error }, 'Submit Product API Error');
      const { messages: serverMessages, firstPath } = applyServerErrors(error);
      if (firstPath) {
        focusMissingField(firstPath);
        return;
      }
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
    focusFirstError(errors);
  };

  return { isSubmitting, handleSubmitProduct, handleFormInvalid };
}
