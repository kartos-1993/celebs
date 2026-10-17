import { createContext, useContext, useMemo } from 'react';
import {
  type Control,
  type FieldValues,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';

import type { FieldSpec, ProductSidebarSection, VariantMetaItem } from '../types';
import { buildSidebarSections, flattenFormErrors } from '../utils/add-product-validation';

interface UseSubmissionStateOptions {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<Pick<VariantMetaItem, 'key' | 'label'>>;
}

/**
 * THE error-reveal gate. Every inline renderer must ask `revealError(itsOwnPath)`
 * instead of reading RHF's error directly, because "this field is wrong" is not
 * the same question as "should the seller see that it is wrong".
 *
 * The contract is per FIELD, not per form: revealing on "any field was
 * touched" is what made typing one Fabric character light up the pricing and
 * image sections. A field reveals on a submit attempt, or on that field itself
 * being touched — never because a sibling was touched.
 */
export interface FieldErrorReveal {
  hasAttemptedSubmit: boolean;
  revealError: (fieldPath: string) => boolean;
}

/**
 * Optional override. The sidebar publishes the gate through this context, but
 * the provider sits inside the sidebar column while the inline renderers live
 * in a SIBLING subtree — so a consumer below the form can never see it. The
 * context is therefore an override, never the only channel; see
 * `useFieldErrorReveal`.
 */
export const FieldErrorRevealContext = createContext<FieldErrorReveal | null>(null);

export const FieldErrorRevealProvider = FieldErrorRevealContext.Provider;

/**
 * Stable identity for "nothing touched yet". `touchedFields ?? {}` inline would
 * mint a new object on every render, so the gate memo below would rebuild on
 * every keystroke and each inline renderer would re-render with it.
 */
const NOTHING_TOUCHED: Record<string, unknown> = {};

/**
 * Walks RHF's `touchedFields` down a dotted path. `touchedFields` is nested
 * (`{ sku: { variants: { Color: { Red: true } } } }`) and array-shaped for
 * indexed paths, so a flat `path in touchedFields` check misses both.
 */
const hasTouchedPath = (touched: Record<string, unknown>, path: string): boolean => {
  let node: unknown = touched;
  for (const segment of path.split('.')) {
    if (Array.isArray(node)) {
      node = node[Number(segment)];
    } else if (node && typeof node === 'object') {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return false;
    }
    if (node === true) return true;
  }
  return false;
};

/**
 * The gate derived straight from RHF's own `touchedFields` / submit counters.
 *
 * Every inline renderer is inside `<Form {...form}>`, so this is the channel
 * that actually reaches them. Passing `control` is optional: without it RHF
 * falls back to the nearest `FormProvider`, which is the same instance.
 */
const useRhfFieldErrorReveal = (control?: Control<FieldValues>): FieldErrorReveal => {
  const { isSubmitted, submitCount, touchedFields } = useFormState({ control });
  const hasAttemptedSubmit = submitCount > 0 || isSubmitted;
  const touchedSnapshot = touchedFields ?? NOTHING_TOUCHED;

  return useMemo(
    () => ({
      hasAttemptedSubmit,
      revealError: (fieldPath: string) =>
        hasAttemptedSubmit || hasTouchedPath(touchedSnapshot, fieldPath),
    }),
    [hasAttemptedSubmit, touchedSnapshot],
  );
};

/**
 * THE gate for an inline error renderer. Never `null`: a renderer that got
 * `null` would have to invent a default, and inventing "reveal" is exactly the
 * defect. The sidebar's published value wins when present; otherwise the gate is
 * derived from RHF for this exact subtree.
 */
export const useFieldErrorReveal = (control?: Control<FieldValues>): FieldErrorReveal => {
  const published = useContext(FieldErrorRevealContext);
  const derived = useRhfFieldErrorReveal(control);
  return published ?? derived;
};

/**
 * Single source of truth for submission readiness. Consumed by:
 *  - SubmissionProgressChecklist (sidebar)
 *  - ProductFormActionsContainer (submit bar)
 *  - the submit handler in add-product (validation gate + scroll target)
 */
export function useSubmissionState({
  schemaFields,
  schemaHasName,
  variantMeta,
}: UseSubmissionStateOptions) {
  const {
    control,
    formState: { errors, submitCount, isSubmitted, touchedFields },
  } = useFormContext();
  // Synchronous watch on purpose: the checklist must agree with RHF errors
  // on the same render. A deferred value here shows stale red/green for a
  // frame after every keystroke and upload.
  const formValues = useWatch({ control }) as Record<string, unknown>;

  const fieldErrors = useMemo(() => flattenFormErrors(errors), [errors]);

  const sections: ProductSidebarSection[] = useMemo(
    () =>
      buildSidebarSections({
        fieldErrors,
        schemaFields,
        schemaHasName,
        values: formValues || {},
        variantMeta: variantMeta.map((variant) => ({
          key: variant.key,
          label: variant.label,
        })),
      }),
    [fieldErrors, formValues, schemaFields, schemaHasName, variantMeta],
  );

  // Only `complete` counts. `untouched` is not a failure and must never inflate
  // the score; `incomplete` is the only other state and it does not count.
  const completedCount = sections.filter((section) => section.status === 'complete').length;
  const completionPercentage =
    sections.length === 0 ? 0 : Math.round((completedCount / sections.length) * 100);
  const firstInvalidSection = sections.find((section) => section.status !== 'complete');
  const isReady = sections.length > 0 && !firstInvalidSection;
  const hasAttemptedSubmit = submitCount > 0 || isSubmitted;
  // Pristine forms stay clean (submitCount gate); touched-field errors show
  // immediately once the user interacts, even before the first submit.
  const hasTouchedFields = Object.keys(touchedFields || {}).length > 0;
  const showErrors = hasAttemptedSubmit || hasTouchedFields;

  // Same gate `useFieldErrorReveal` derives, kept here so the sidebar and the
  // inline renderers can never drift apart.
  const touchedSnapshot = touchedFields ?? NOTHING_TOUCHED;
  const fieldErrorReveal = useMemo<FieldErrorReveal>(
    () => ({
      hasAttemptedSubmit,
      revealError: (fieldPath: string) =>
        hasAttemptedSubmit || hasTouchedPath(touchedSnapshot, fieldPath),
    }),
    [hasAttemptedSubmit, touchedSnapshot],
  );

  return {
    sections,
    completionPercentage,
    firstInvalidSection,
    isReady,
    hasAttemptedSubmit,
    hasTouchedFields,
    showErrors,
    fieldErrorReveal,
    formValues,
    fieldErrors,
  };
}
