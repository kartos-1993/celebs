import { memo } from 'react';

import { useSubmissionState } from '../../hooks/use-submission-state';
import type { FieldSpec, VariantMetaItem } from '../../types';
import { SubmissionProgressChecklist } from '../submission-progress-checklist';

interface ProductSubmissionSidebarProps {
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  variantMeta: Array<Pick<VariantMetaItem, 'key' | 'label'>>;
  onSectionClick: (anchorId: string) => void;
}

export const ProductSubmissionSidebar = memo(function ProductSubmissionSidebar({
  schemaFields,
  schemaHasName,
  variantMeta,
  onSectionClick,
}: ProductSubmissionSidebarProps) {
  const { sections, completionPercentage } = useSubmissionState({
    schemaFields,
    schemaHasName,
    variantMeta,
  });

  return (
    <aside className="sticky top-20 hidden space-y-4 self-start lg:block">
      <SubmissionProgressChecklist
        sections={sections}
        completionPercentage={completionPercentage}
        onSectionClick={onSectionClick}
      />
    </aside>
  );
});
