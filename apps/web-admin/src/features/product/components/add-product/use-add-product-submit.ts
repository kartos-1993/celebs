import { useCallback, useState } from 'react';
import type { FieldErrors, Path, UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { logger } from '@celebs/shared-utils';

import { useProductDraft } from '../../hooks/use-product-draft';
import { useProductMutations } from '../../hooks/use-product-queries';
import type { CreateProductRequest, FieldSpec, ProductFormValues } from '../../types';
import {
  getNestedValue,
  MANAGE_PRODUCTS_PATH,
  normalizeText,
  resolvePageSectionKey,
  uniqueMessages,
} from '../../utils/add-product-helpers';
import { buildProductPayload } from '../../utils/add-product-payload';
import {
  buildSidebarSections,
  flattenFormErrors,
  isRequiredFieldFilled,
  PRODUCT_SECTION_ANCHORS,
} from '../../utils/add-product-validation';
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

interface ServerErrorEntry {
  field?: string;
  path?: string;
  message?: string;
}

const readServerErrorEntries = (error: unknown): ServerErrorEntry[] => {
  if (!error || typeof error !== 'object') return [];
  const envelope = error as { errors?: unknown; data?: unknown; response?: { data?: unknown } };
  const body = (envelope.response?.data ?? envelope.data) as { errors?: unknown } | undefined;

  // Current contract: `{ errors: [{ field?, message }] }`. `data` / `data.errors`
  // are the older envelope shapes and stay readable until every caller is cut
  // over — a flat candidate list, not a chained fallback.
  const candidates = [envelope.errors, body?.errors, envelope.data, envelope.response?.data];
  const list = candidates.find((candidate) => Array.isArray(candidate));
  return (list ?? []) as ServerErrorEntry[];
};

interface FocusableSection {
  key: string;
  anchorId: string;
}

/**
 * Reveals the first blocker in a failing section: an existing RHF error, else
 * the section's first unanswered required field, else the section anchor.
 */
const focusSectionBlocker = (
  section: FocusableSection,
  form: UseFormReturn<ProductFormValues>,
  schemaFields: FieldSpec[],
  values: Record<string, unknown>,
): void => {
  const focused = focusFirstError(form.formState.errors, section.anchorId);
  if (focused) return;

  const missingField = schemaFields
    .filter((field) => resolvePageSectionKey(field.name, schemaFields) === section.key)
    .find(
      (field) =>
        field.required &&
        field.visible !== false &&
        !isRequiredFieldFilled(field, getNestedValue(values, field.name)),
    );

  if (missingField) {
    form.setError(missingField.name as Path<ProductFormValues>, {
      type: 'manual',
      message: `${missingField.label} is required`,
    });
    focusMissingField(missingField.name, section.anchorId);
    return;
  }
  document.getElementById(section.anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** Axis overflow past two groups has no cell to focus — flag the extra axes. */
const flagOverflowingVariantAxes = (
  variantMeta: Array<{ key: string; label: string }>,
  form: UseFormReturn<ProductFormValues>,
): void => {
  const extras = variantMeta.slice(2);
  extras.forEach((extra) => {
    form.setError(extra.key as Path<ProductFormValues>, {
      type: 'manual',
      message: `Clear ${extra.label} values — the pricing matrix supports two variant groups`,
    });
  });
  focusMissingField(extras[0].key, PRODUCT_SECTION_ANCHORS.pricingVariant);
};

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

  // Mapped entries (`field`) become field errors so the normal focus path finds
  // them; unmapped ones are surfaced in the toast, never dropped.
  const applyServerErrors = useCallback(
    (error: unknown): { messages: string[]; firstPath?: string } => {
      const unmappedMessages: string[] = [];
      let firstPath: string | undefined;

      readServerErrorEntries(error).forEach((item) => {
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

    // Validate first so untouched invalid fields cannot slip through the
    // sidebar gate on stale formState.errors. Scoped to publish/update
    // submits only: the Save-Draft path (type="button" → draft.saveDraftNow)
    // intentionally bypasses this gate and stays unvalidated so partial work
    // is never blocked.
    await form.trigger();
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
        flagOverflowingVariantAxes(variantMeta, form);
        return;
      }
      focusSectionBlocker(firstInvalidSection, form, schemaFields, currentValues);
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
