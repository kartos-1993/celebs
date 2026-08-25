import { useDeferredValue, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import type { FieldSpec, ProductSidebarSection, VariantMetaItem } from '../types';
import { buildSidebarSections, flattenFormErrors } from '../utils/add-product-validation';

interface UseSubmissionStateOptions {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<Pick<VariantMetaItem, 'key' | 'label'>>;
}

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
    formState: { errors },
  } = useFormContext();
  const rawFormValues = useWatch({ control }) as Record<string, unknown>;
  const formValues = useDeferredValue(rawFormValues);

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

  const completedCount = sections.filter((section) => section.status).length;
  const completionPercentage =
    sections.length === 0 ? 0 : Math.round((completedCount / sections.length) * 100);
  const firstInvalidSection = sections.find((section) => !section.status);
  const isReady = sections.length > 0 && !firstInvalidSection;

  return {
    sections,
    completionPercentage,
    firstInvalidSection,
    isReady,
    formValues,
    fieldErrors,
  };
}
