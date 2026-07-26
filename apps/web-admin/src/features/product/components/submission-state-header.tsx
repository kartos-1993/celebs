import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FieldSpec } from '../fields/UiRegistry';
import {
  buildSidebarSections,
  flattenFormErrors,
} from '../utils/add-product-validation';

interface SubmissionStateHeaderProps {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<{ key: string; label: string }>;
}

export const SubmissionStateHeader = ({
  schemaFields,
  schemaHasName,
  variantMeta,
}: SubmissionStateHeaderProps) => {
  const { control, formState: { errors } } = useFormContext();
  const formValues = useWatch({ control }) as Record<string, unknown>;
  const fieldErrors = useMemo(() => flattenFormErrors(errors), [errors]);

  const sidebarSections = useMemo(
    () =>
      buildSidebarSections({
        fieldErrors,
        schemaFields,
        schemaHasName,
        values: formValues,
        variantMeta,
      }),
    [fieldErrors, formValues, schemaFields, schemaHasName, variantMeta],
  );

  const completionPercentage = useMemo(() => {
    if (sidebarSections.length === 0) return 0;
    return Math.round(
      (sidebarSections.filter((section) => section.status).length /
        sidebarSections.length) *
      100,
    );
  }, [sidebarSections]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
        Submission State
      </p>
      <p className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">
        {completionPercentage === 100 ? 'Ready to submit' : 'In progress'}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {sidebarSections.filter((section) => section.status).length} of{' '}
        {sidebarSections.length} sections done
      </p>
    </div>
  );
};

export default SubmissionStateHeader;
