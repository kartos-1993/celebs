import { memo } from 'react';

import { FieldErrorRevealProvider, useFieldErrorReveal } from '../hooks/use-submission-state';
import type { ProductSidebarSection } from '../types';

import ProductFormSidebar from './product-form-sidebar';

interface SubmissionProgressChecklistProps {
  sections: ProductSidebarSection[];
  completionPercentage: number;
  /**
   * The exact "seller pressed submit" flag from `useSubmissionState`. Optional
   * only so existing callers keep compiling: when it is absent the flag is read
   * from RHF directly, which is strictly more accurate than the `showErrors`
   * superset (that one is true the moment ANY field is touched).
   */
  hasAttemptedSubmit?: boolean;
  onSectionClick: (anchorId: string) => void;
  showErrors?: boolean;
}

const SubmissionProgressChecklistComponent = ({
  sections,
  completionPercentage,
  hasAttemptedSubmit,
  onSectionClick,
  showErrors = false,
}: SubmissionProgressChecklistProps) => {
  const gate = useFieldErrorReveal();
  const attemptedSubmit = hasAttemptedSubmit ?? gate.hasAttemptedSubmit ?? showErrors;

  return (
    <FieldErrorRevealProvider value={{ ...gate, hasAttemptedSubmit: attemptedSubmit }}>
      <ProductFormSidebar
        completionPercentage={completionPercentage}
        hasAttemptedSubmit={attemptedSubmit}
        sections={sections}
        onSectionClick={onSectionClick}
        tips={['Upload 3+ clear images.', 'Fill category specs.', 'Verify discount prices.']}
      />
    </FieldErrorRevealProvider>
  );
};

export const SubmissionProgressChecklist = memo(SubmissionProgressChecklistComponent);
export default SubmissionProgressChecklist;
