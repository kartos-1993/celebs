import { memo, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FieldSpec } from '../fields/ui-registry';
import ProductFormSidebar from './productform-sidebar';
import { buildSidebarSections, flattenFormErrors } from '../utils/add-product-validation';

interface SubmissionProgressChecklistProps {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<{ key: string; label: string }>;
  onSectionClick: (anchorId: string) => void;
}

const SubmissionProgressChecklistComponent = ({
  schemaFields,
  schemaHasName,
  variantMeta,
  onSectionClick,
}: SubmissionProgressChecklistProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();
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
      (sidebarSections.filter((section) => section.status).length / sidebarSections.length) * 100,
    );
  }, [sidebarSections]);

  return (
    <ProductFormSidebar
      completionPercentage={completionPercentage}
      sections={sidebarSections}
      onSectionClick={onSectionClick}
      tips={['Upload 3+ clear images.', 'Fill category specs.', 'Verify discount prices.']}
    />
  );
};

export const SubmissionProgressChecklist = memo(SubmissionProgressChecklistComponent);

export default SubmissionProgressChecklist;
