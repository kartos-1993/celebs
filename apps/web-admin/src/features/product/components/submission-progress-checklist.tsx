import { memo } from 'react';
import type { ProductSidebarSection } from '../types';
import ProductFormSidebar from './productform-sidebar';

interface SubmissionProgressChecklistProps {
  sections: ProductSidebarSection[];
  completionPercentage: number;
  onSectionClick: (anchorId: string) => void;
}

const SubmissionProgressChecklistComponent = ({
  sections,
  completionPercentage,
  onSectionClick,
}: SubmissionProgressChecklistProps) => (
  <ProductFormSidebar
    completionPercentage={completionPercentage}
    sections={sections}
    onSectionClick={onSectionClick}
    tips={['Upload 3+ clear images.', 'Fill category specs.', 'Verify discount prices.']}
  />
);

export const SubmissionProgressChecklist = memo(SubmissionProgressChecklistComponent);
export default SubmissionProgressChecklist;
