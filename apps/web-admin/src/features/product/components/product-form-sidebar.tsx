import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Progress } from '@celebs/shared-ui/components/progress';

import type { ProductSidebarSection } from '../types';

export type { ProductSidebarSection };

// Errors rendered inline before the overflow link appears; the exact remainder
// is always shown so a truncated slice never hides a blocker silently.
const VISIBLE_ERRORS_PER_SECTION = 3;

const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground';
const CARD = 'rounded-2xl border border-border bg-card p-3.5 shadow-xs';
const SCORE_BADGE = 'rounded-full border-border bg-card px-2 py-0 text-xs';

interface ProductFormSidebarProps {
  completionPercentage: number;
  onSectionClick?: (anchorId: string) => void;
  sections: ProductSidebarSection[];
  tips?: string[];
  showErrors?: boolean;
}
interface SectionRowProps {
  section: ProductSidebarSection;
  showErrors: boolean;
  onSelect: (anchorId: string) => void;
}

const scoreMeta = (score: number) => {
  if (score >= 90) return { label: 'Excellent', tone: 'text-success' };
  if (score >= 70) return { label: 'Good', tone: 'text-info' };
  if (score >= 40) return { label: 'Fair', tone: 'text-warning' };
  return { label: 'Needs Info', tone: 'text-warning' };
};

const SidebarSectionRow = ({ section, showErrors, onSelect }: SectionRowProps) => {
  const revealErrors = showErrors && !section.status;
  const visibleErrors = revealErrors ? section.errors.slice(0, VISIBLE_ERRORS_PER_SECTION) : [];
  const hiddenCount = revealErrors ? section.errors.length - visibleErrors.length : 0;
  const StatusIcon = section.status ? CheckCircle2 : Circle;
  const iconTone = section.status ? 'text-success' : 'text-muted-foreground/60';

  return (
    <div className="rounded-xl px-2 py-1.5 transition hover:bg-muted">
      <button
        type="button"
        data-testid={`sidebar-section-${section.key}`}
        onClick={() => onSelect(section.anchorId)}
        className="flex w-full items-start gap-2 text-left"
      >
        <StatusIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconTone}`} />
        <span
          className={`block truncate text-xs font-medium ${section.status ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {section.label}
        </span>
      </button>

      {visibleErrors.length > 0 && (
        <ul className="ml-6 mt-0.5 space-y-0.5">
          {visibleErrors.map((message) => (
            <li key={message} title={message} className="text-xs leading-tight text-destructive">
              {message}
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onSelect(section.anchorId)}
          className="ml-6 text-xs font-medium leading-tight text-primary"
        >
          +{hiddenCount} more — view section
        </button>
      )}
    </div>
  );
};

const ProductFormSidebar = ({
  completionPercentage,
  onSectionClick,
  sections,
  tips = [],
  showErrors = false,
}: ProductFormSidebarProps) => {
  const score = scoreMeta(completionPercentage);
  const completedCount = sections.filter((s) => s.status).length;
  const headline = completionPercentage === 100 ? 'Ready to submit' : 'In progress';
  const select = (anchorId: string) => onSectionClick?.(anchorId);

  return (
    <div className="space-y-3">
      <div className={CARD}>
        <p className={EYEBROW}>Submission State</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{headline}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {`${completedCount} of ${sections.length} sections done`}
        </p>
      </div>

      <div className={CARD}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={EYEBROW}>Content Score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{completionPercentage}%</span>
              <Badge variant="outline" className={`${SCORE_BADGE} ${score.tone}`}>
                {score.label}
              </Badge>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <Progress value={completionPercentage} className="mt-2.5 h-1.5 bg-muted" />
      </div>

      <div className={CARD}>
        <p className={EYEBROW}>Checklist</p>
        <div className="mt-2 space-y-0.5">
          {sections.map((section) => (
            <SidebarSectionRow
              key={section.key}
              section={section}
              showErrors={showErrors}
              onSelect={select}
            />
          ))}
        </div>
      </div>

      {tips.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/50 p-3 shadow-xs">
          <p className={EYEBROW}>Tips</p>
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
