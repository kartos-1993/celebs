import { memo, useEffect, useRef } from 'react';
import { type Control, type FieldValues, useFormContext } from 'react-hook-form';

import { logger } from '@celebs/shared-utils';

import { getDraftStorageKey, serializeDraftValue } from '../../utils/add-product-helpers';

interface DraftAutoSaverProps {
  control: Control<FieldValues>;
  draftRestored: boolean;
  isEditMode: boolean;
  /**
   * True from a `discardDraft` / `resetForNewCategory` until the seller's first
   * real edit. Without it the 1s debounce below rewrites the BLANK form those
   * two just emptied, and the discarded work returns as a "restored draft".
   */
  suppressAutosave: boolean;
  watchedCategoryId: string;
  watchedSubcategoryId: string;
  categoryPath: string[] | undefined;
  getValues: () => Record<string, unknown>;
  userId?: string;
  storeId?: string;
}

export const DraftAutoSaver = memo(
  ({
    draftRestored,
    isEditMode,
    suppressAutosave,
    watchedCategoryId,
    watchedSubcategoryId,
    categoryPath,
    getValues,
    userId,
    storeId,
  }: DraftAutoSaverProps) => {
    const { watch } = useFormContext();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (
        suppressAutosave ||
        !draftRestored ||
        isEditMode ||
        !watchedCategoryId ||
        !watchedSubcategoryId
      ) {
        return;
      }

      const scheduleSave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          const values = getValues();
          if (values.categoryId && values.subcategoryId) {
            try {
              window.localStorage.setItem(
                getDraftStorageKey(userId, storeId),
                JSON.stringify({
                  categoryPath,
                  savedAt: new Date().toISOString(),
                  storeId,
                  values: serializeDraftValue(values),
                }),
              );
            } catch (error) {
              // Private mode / quota — autosave stays best-effort, but the
              // failure is logged so a silently-never-saving draft is
              // diagnosable instead of invisible. Explicit "Save Draft"
              // surfaces the same failure to the seller.
              logger.warn(
                { error },
                'Draft autosave skipped: storage unavailable or quota exceeded',
              );
            }
          }
        }, 1000);
      };

      scheduleSave();
      const subscription = watch(scheduleSave);

      return () => {
        subscription.unsubscribe();
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [
      draftRestored,
      suppressAutosave,
      categoryPath,
      isEditMode,
      watchedCategoryId,
      watchedSubcategoryId,
      getValues,
      userId,
      storeId,
      watch,
    ]);

    return null;
  },
);
