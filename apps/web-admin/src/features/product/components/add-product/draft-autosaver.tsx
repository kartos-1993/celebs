import { memo, useEffect } from 'react';
import { useWatch, type Control, type FieldValues } from 'react-hook-form';
import { getDraftStorageKey, serializeDraftValue } from '../../utils/add-product-helpers';

interface DraftAutoSaverProps {
    control: Control<FieldValues>;
    draftRestored: boolean;
    isEditMode: boolean;
    watchedCategoryId: string;
    watchedSubcategoryId: string;
    categoryPath: string[] | undefined;
    getValues: () => Record<string, unknown>;
    userId?: string;
}

export const DraftAutoSaver = memo(
    ({
        control,
        draftRestored,
        isEditMode,
        watchedCategoryId,
        watchedSubcategoryId,
        categoryPath,
        getValues,
        userId,
    }: DraftAutoSaverProps) => {
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
        }, [
            draftRestored,
            watchedFormValues,
            categoryPath,
            isEditMode,
            watchedCategoryId,
            watchedSubcategoryId,
            getValues,
            userId,
        ]);

        return null;
    },
);