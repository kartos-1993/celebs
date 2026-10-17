import { Sparkles } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Progress } from '@celebs/shared-ui/components/progress';

import type { ProductSidebarSection } from '../types';

import {
  scoreMeta,
  SIDEBAR_CARD,
  SIDEBAR_EYEBROW,
  SIDEBAR_SCORE_BADGE,
} from './sidebar-section-helpers';
import { SidebarSectionRow } from './sidebar-section-row';

export type { ProductSidebarSection };

interface ProductFormSidebarProps {
  completionPercentage: number;
  /**
   * True once the seller has pressed submit. Forward the exact flag from
   * `useSubmissionState`; it is the only moment a section the seller has not
   * touched is allowed to speak up.
   */
  hasAttemptedSubmit?: boolean;
  onSectionClick?: (anchorId: string) => void;
  sections: ProductSidebarSection[];
  tips?: string[];
  /**
   * @deprecated Superseded by the tri-state `section.status` plus
   * `hasAttemptedSubmit`. Still accepted so existing callers keep compiling.
   */
  showErrors?: boolean;
}

const ProductFormSidebar = ({
  completionPercentage,
  hasAttemptedSubmit = false,
  onSectionClick,
  sections,
  tips = [],
}: ProductFormSidebarProps) => {
  const score = scoreMeta(completionPercentage);
  // Only `complete` is done. `untouched` is not a failure and must never
  // inflate the count — that is what made an empty form read as finished.
  const completedCount = sections.filter((s) => s.status === 'complete').length;
  const headline = completionPercentage === 100 ? 'Ready to submit' : 'In progress';
  const select = (anchorId: string) => onSectionClick?.(anchorId);

  return (
    <div className="space-y-3">
      <div className={SIDEBAR_CARD}>
        <p className={SIDEBAR_EYEBROW}>Submission State</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{headline}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {`${completedCount} of ${sections.length} sections done`}
        </p>
      </div>

      <div className={SIDEBAR_CARD}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={SIDEBAR_EYEBROW}>Content Score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{completionPercentage}%</span>
              <Badge variant="outline" className={`${SIDEBAR_SCORE_BADGE} ${score.tone}`}>
                {score.label}
              </Badge>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <Progress value={completionPercentage} className="mt-2.5 h-1.5 bg-muted" />
      </div>

      <div className={SIDEBAR_CARD}>
        <p className={SIDEBAR_EYEBROW}>Checklist</p>
        <div className="mt-2 space-y-0.5">
          {sections.map((section) => (
            <SidebarSectionRow
              key={section.key}
              hasAttemptedSubmit={hasAttemptedSubmit}
              section={section}
              onSelect={select}
            />
          ))}
        </div>
      </div>

      {tips.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/50 p-3 shadow-xs">
          <p className={SIDEBAR_EYEBROW}>Tips</p>
          <div className="mt-1.5 space-y-1 text-xs leading-snug text-muted-foreground">
            {tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFormSidebar;
