import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Progress } from '@celebs/shared-ui/components/progress';

import type { ProductSidebarSection } from '../types';

export type { ProductSidebarSection };

interface ProductFormSidebarProps {
  completionPercentage: number;
  onSectionClick?: (anchorId: string) => void;
  sections: ProductSidebarSection[];
  tips?: string[];
}

const scoreMeta = (score: number) => {
  if (score >= 90) {
    return {
      label: 'Excellent',
      tone: 'text-success',
      bar: 'bg-success',
    };
  }
  if (score >= 70) {
    return { label: 'Good', tone: 'text-info', bar: 'bg-info' };
  }
  if (score >= 40) {
    return { label: 'Fair', tone: 'text-warning', bar: 'bg-warning' };
  }
  return { label: 'Needs Info', tone: 'text-warning', bar: 'bg-warning' };
};

const ProductFormSidebar = ({
  completionPercentage,
  onSectionClick,
  sections,
  tips = [],
}: ProductFormSidebarProps) => {
  const score = scoreMeta(completionPercentage);
  const completedCount = sections.filter((s) => s.status).length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Submission State
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {completionPercentage === 100 ? 'Ready to submit' : 'In progress'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {completedCount} of {sections.length} sections done
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Content Score
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {completionPercentage}%
              </span>
              <Badge
                variant="outline"
                className={`rounded-full border-border px-2 py-0 text-xs bg-card ${score.tone}`}
              >
                {score.label}
              </Badge>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        <Progress
          value={completionPercentage}
          className="mt-2.5 h-1.5 bg-muted"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
        <p className="text-xs font-semibold text-foreground">Checklist</p>
        <div className="mt-2 space-y-0.5">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              data-testid={`sidebar-section-${section.key}`}
              onClick={() => onSectionClick?.(section.anchorId)}
              className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-muted"
            >
              <span className="mt-0.5 shrink-0">
                {section.status ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-xs font-medium truncate ${section.status ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {section.label}
                </span>
                {!section.status && section.errors[0] ? (
                  <span className="block text-xs text-destructive leading-tight truncate">
                    {section.errors[0]}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tips.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/50 p-3 shadow-sm">
          <p className="text-xs font-semibold text-foreground">Tips</p>
          <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {tips.map((tip) => (
              <p key={tip} className="leading-snug">
                {tip}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFormSidebar;
