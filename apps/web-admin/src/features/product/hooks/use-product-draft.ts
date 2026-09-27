import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { logger } from '@celebs/shared-utils';

import type { ProductDraft, ProductFormValues } from '../types';
import {
  getDraftStorageKey,
  isDraftExpired,
  serializeDraftValue,
} from '../utils/add-product-helpers';

interface UseProductDraftOptions {
  form: UseFormReturn<ProductFormValues>;
  userId?: string;
  storeId?: string;
  isEditMode: boolean;
  initialCategoryPath?: string[];
  /** Visible schema field names re-validated after a discard/reset. */
  visibleFieldNames?: string[];
}

/**
 * Fields the basic-info section owns; always part of the post-reset
 * validation scope so a blank reset cannot read as "valid".
 */
const RESET_SCOPE_FIELDS = ['name', 'brand', 'description', 'categoryId', 'subcategoryId'];

/** Merges caller-supplied field names with the always-validated base scope. */
export function resolveResetValidationScope(visibleFieldNames: string[] = []): string[] {
  return [...new Set([...RESET_SCOPE_FIELDS, ...visibleFieldNames])];
}

export function useProductDraft({
  form,
  userId,
  storeId,
  isEditMode,
  initialCategoryPath,
  visibleFieldNames: visibleFieldNamesOption,
}: UseProductDraftOptions) {
  const [draftRestored, setDraftRestored] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState<string[] | undefined>(initialCategoryPath);
  const draftAppliedRef = useRef(false);

  const validationScope = useMemo(
    () => resolveResetValidationScope(visibleFieldNamesOption),
    [visibleFieldNamesOption],
  );

  /**
   * `clearErrors()` alone leaves the form looking pristine-but-valid: a
   * freshly blanked required field would slip past the submit gate. Re-run
   * validation over the visible scope so the cleared state is re-derived
   * from the values instead of trusted.
   */
  const clearErrorsAndRevalidate = useCallback(() => {
    form.clearErrors();
    void form.trigger(validationScope);
  }, [form, validationScope]);

  useEffect(() => {
    if (initialCategoryPath?.length && !categoryPath?.length) {
      setCategoryPath(initialCategoryPath);
    }
  }, [initialCategoryPath, categoryPath?.length]);

  const draftKey = getDraftStorageKey(userId, storeId);

  const setFormField = useCallback(
    (
      key: string,
      value: unknown,
      options?: { shouldDirty?: boolean; shouldValidate?: boolean },
    ) => {
      form.setValue(key, value, options);
    },
    [form],
  );

  // Restore once on mount. Guarded by ref so later schema/query updates can
  // never re-apply stale draft values over the user's live edits.
  useEffect(() => {
    if (isEditMode) {
      setDraftRestored(true);
      return;
    }
    if (draftAppliedRef.current) return;
    draftAppliedRef.current = true;

    const rawDraft = window.localStorage.getItem(draftKey);
    if (!rawDraft) {
      setDraftRestored(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as ProductDraft;
      if (isDraftExpired(draft.savedAt)) {
        window.localStorage.removeItem(draftKey);
        return;
      }
      if (storeId && draft.storeId && draft.storeId !== storeId) {
        return;
      }
      if (Array.isArray(draft.categoryPath)) setCategoryPath(draft.categoryPath);
      if (draft.savedAt) setRestoredDraftAt(draft.savedAt);

      if (draft.values) {
        const valObj = draft.values;

        // Category ids first so schema effects key off correct values
        if (valObj.categoryId && !form.getValues('categoryId')) {
          setFormField('categoryId', String(valObj.categoryId), { shouldValidate: true });
        }
        if (valObj.subcategoryId && !form.getValues('subcategoryId')) {
          setFormField('subcategoryId', String(valObj.subcategoryId), { shouldValidate: true });
        }

        // Nested-only restore — never persist dot-keys like "sku.default.price".
        form.reset({
          ...form.getValues(),
          ...valObj,
          status: 'draft',
        });

        for (const [key, val] of Object.entries(valObj)) {
          if (val !== undefined && val !== null) {
            setFormField(key, val, { shouldDirty: true, shouldValidate: false });
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to restore draft; purging corrupted draft');
      window.localStorage.removeItem(draftKey);
    } finally {
      setDraftRestored(true);
    }
  }, [draftKey, form, isEditMode, setFormField]);

  /** Manual "Save Draft" action. Returns false if the form has no category yet. */
  const saveDraftNow = useCallback((): boolean => {
    const values = form.getValues() as Record<string, unknown>;
    if (!values.categoryId || !values.subcategoryId) return false;

    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          categoryPath,
          savedAt: new Date().toISOString(),
          storeId,
          values: serializeDraftValue(values) as Record<string, unknown>,
        } satisfies ProductDraft),
      );
    } catch (error) {
      logger.warn({ error }, 'Draft save skipped: storage unavailable or quota exceeded');
      return false;
    }
    setRestoredDraftAt(new Date().toISOString());
    return true;
  }, [categoryPath, draftKey, form, storeId]);

  /** Clear saved draft from localStorage without resetting form state (e.g. after successful submit). */
  const clearSavedDraft = useCallback(() => {
    window.localStorage.removeItem(draftKey);
    setRestoredDraftAt(null);
  }, [draftKey]);

  /** Discard draft and reset to a blank form. */
  const discardDraft = useCallback(() => {
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
    setRestoredDraftAt(null);
    clearErrorsAndRevalidate();
  }, [clearErrorsAndRevalidate, draftKey, form]);

  /** Full reset when the seller switches category (draft is invalidated). */
  const resetForNewCategory = useCallback(
    (categoryId: string) => {
      window.localStorage.removeItem(draftKey);
      form.reset({
        name: '',
        brand: '',
        description: '',
        categoryId,
        subcategoryId: categoryId,
        status: 'draft',
        mainImage: [],
        sku: { default: { price: '', stock: '', sellerSku: '', available: true } },
      });
      setCategoryPath(undefined);
      setRestoredDraftAt(null);
      clearErrorsAndRevalidate();
    },
    [clearErrorsAndRevalidate, draftKey, form],
  );

  return {
    draftRestored,
    restoredDraftAt,
    categoryPath,
    setCategoryPath,
    saveDraftNow,
    clearSavedDraft,
    discardDraft,
    resetForNewCategory,
  };
}
