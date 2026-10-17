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

  /**
   * THE DISCARDED-DRAFT GUARD.
   *
   * `discardDraft` / `resetForNewCategory` delete the saved draft and blank the
   * form, but the autosave is a 1s debounce over the WHOLE form: a second later
   * it wrote that blank form back to localStorage, and the next visit reported
   * the discarded work as a "restored draft" the seller could not explain away.
   * Suppression is the fix; `draftRestored` must NOT be used for it, because
   * flipping that hides the entire form behind the loading state.
   */
  const [isDraftAutosaveSuppressed, setDraftAutosaveSuppressed] = useState(false);
  // Mirrored in a ref because the `form.watch` subscription below is registered
  // once and must read the CURRENT flag without re-subscribing on every change.
  const autosaveSuppressedRef = useRef(false);

  const writeDraftAutosaveSuppressed = useCallback((next: boolean) => {
    autosaveSuppressedRef.current = next;
    setDraftAutosaveSuppressed(next);
  }, []);

  /**
   * Cleared by the first SELLER edit after a reset or discard. RHF's watch
   * payload is the discriminator, and every one of its three parts was checked:
   *
   *   `form.reset(values)`  → neither a field name nor an event type
   *   `form.setValue(...)`  → a field name, but no event type
   *   a real input change    → BOTH
   *
   * Requiring the event type is what makes this correct. A category switch always
   * runs `handleSubcategoryChange` (a `setValue`) right after the reset, so a
   * name-only test would clear the flag before the seller had typed a character
   * and the blank form would be re-saved a second later anyway.
   */
  useEffect(() => {
    const subscription = form.watch((_values, { name: changedName, type: eventType }) => {
      if (!changedName || !eventType || !autosaveSuppressedRef.current) return;
      writeDraftAutosaveSuppressed(false);
    });
    return () => subscription.unsubscribe();
  }, [form, writeDraftAutosaveSuppressed]);

  const validationScope = useMemo(
    () => resolveResetValidationScope(visibleFieldNamesOption),
    [visibleFieldNamesOption],
  );

  /**
   * After a reset the form must read as blank, not as validated. That means
   * CLEARING, never re-deriving: a mass `trigger(scope)` here was the last
   * writer to publish errors, and its scope is built from the PREVIOUS
   * category's `visibleFieldNames` (the new schema query has not resolved).
   * The old fields are still mounted, so it re-derived "X is required" for a
   * whole schema the seller had never opened.
   */
  const clearErrorsForReset = useCallback(() => {
    form.clearErrors();
  }, [form]);

  // Prune errors whose field no longer exists. `shouldUnregister: false` means
  // unmounting a field never clears its error, so a path from a previous
  // category survives every switch and can pin the General section incomplete
  // forever. Only names the previous schema had and the new one does not are
  // dropped, so live sections (sizes, colour galleries, the SKU matrix) are
  // never touched. Deliberately no re-validation: the submit path owns that.
  const previousScopeRef = useRef<string[]>([]);
  useEffect(() => {
    const current = new Set(validationScope);
    const stale = previousScopeRef.current.filter((name) => !current.has(name));
    previousScopeRef.current = [...current];
    if (stale.length > 0) form.clearErrors(stale);
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
    clearErrorsForReset();
    // From here until the seller's next real keystroke, the autosave must not
    // write this blank form back over the draft the seller just discarded.
    writeDraftAutosaveSuppressed(true);
  }, [clearErrorsForReset, draftKey, form, writeDraftAutosaveSuppressed]);

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
        mainImages: [],
        sku: { default: { price: '', stock: '', sellerSku: '', available: true } },
      });
      setCategoryPath(undefined);
      setRestoredDraftAt(null);
      clearErrorsForReset();
      writeDraftAutosaveSuppressed(true);
    },
    [clearErrorsForReset, draftKey, form, writeDraftAutosaveSuppressed],
  );

  return {
    draftRestored,
    restoredDraftAt,
    categoryPath,
    setCategoryPath,
    isDraftAutosaveSuppressed,
    saveDraftNow,
    clearSavedDraft,
    discardDraft,
    resetForNewCategory,
  };
}
