import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { logger } from '@celebs/shared-utils';
import type { ProductDraft } from '../types';
import {
    flattenObject,
    getDraftStorageKey,
    serializeDraftValue,
} from '../utils/add-product-helpers';
import type { ProductFormValues } from './use-product-form';

/** form.setValue widened for dynamic dot-path keys coming from saved drafts. */
type LooseSetValue = (
    name: string,
    value: unknown,
    options?: { shouldDirty?: boolean; shouldValidate?: boolean },
) => void;

interface UseProductDraftOptions {
    form: UseFormReturn<ProductFormValues>;
    userId?: string;
    isEditMode: boolean;
}

export function useProductDraft({ form, userId, isEditMode }: UseProductDraftOptions) {
    const [draftRestored, setDraftRestored] = useState(false);
    const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
    const [categoryPath, setCategoryPath] = useState<string[] | undefined>();
    const draftAppliedRef = useRef(false);

    const setValueLoose = form.setValue as unknown as LooseSetValue;
    const draftKey = getDraftStorageKey(userId);

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
            if (Array.isArray(draft.categoryPath)) setCategoryPath(draft.categoryPath);
            if (draft.savedAt) setRestoredDraftAt(draft.savedAt);

            if (draft.values) {
                const valObj = draft.values;
                const flatVals = flattenObject(valObj);

                // Category ids first so schema effects key off correct values
                if (valObj.categoryId && !form.getValues('categoryId')) {
                    setValueLoose('categoryId', String(valObj.categoryId), { shouldValidate: true });
                }
                if (valObj.subcategoryId && !form.getValues('subcategoryId')) {
                    setValueLoose('subcategoryId', String(valObj.subcategoryId), { shouldValidate: true });
                }

                form.reset({
                    ...form.getValues(),
                    ...valObj,
                    ...flatVals,
                    status: 'draft',
                });

                Object.entries({ ...valObj, ...flatVals }).forEach(([key, val]) => {
                    if (val !== undefined && val !== null) {
                        setValueLoose(key, val, { shouldDirty: true, shouldValidate: false });
                    }
                });
            }
        } catch (error) {
            logger.error({ error }, 'Failed to restore draft; purging corrupted draft');
            window.localStorage.removeItem(draftKey);
        } finally {
            setDraftRestored(true);
        }
    }, [draftKey, form, isEditMode, setValueLoose]);

    /** Manual "Save Draft" action. Returns false if the form has no category yet. */
    const saveDraftNow = useCallback((): boolean => {
        const values = form.getValues() as Record<string, unknown>;
        if (!values.categoryId || !values.subcategoryId) return false;

        window.localStorage.setItem(
            draftKey,
            JSON.stringify({
                categoryPath,
                savedAt: new Date().toISOString(),
                values: serializeDraftValue(values) as Record<string, unknown>,
            } satisfies ProductDraft),
        );
        setRestoredDraftAt(new Date().toISOString());
        return true;
    }, [categoryPath, draftKey, form]);

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
        form.clearErrors();
    }, [draftKey, form]);

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
            form.clearErrors();
        },
        [draftKey, form],
    );

    return {
        draftRestored,
        restoredDraftAt,
        categoryPath,
        setCategoryPath,
        saveDraftNow,
        discardDraft,
        resetForNewCategory,
    };
}