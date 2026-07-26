import { Badge } from '@celebs/shared-ui/components/badge';
import { Progress } from '@celebs/shared-ui/components/progress';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

export interface ProductSidebarSection {
  anchorId: string;
  errors: string[];
  key: string;
  label: string;
  status: boolean;
}

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
      tone: 'text-emerald-600',
      bar: 'bg-emerald-500',
    };
  }
  if (score >= 70) {
    return { label: 'Good', tone: 'text-sky-600', bar: 'bg-sky-500' };
  }
  if (score >= 40) {
    return { label: 'Fair', tone: 'text-amber-600', bar: 'bg-amber-500' };
  }
  return { label: 'Needs Info', tone: 'text-orange-600', bar: 'bg-orange-500' };
};

const ProductFormSidebar = ({
  completionPercentage,
  onSectionClick,
  sections,
  tips = [],
}: ProductFormSidebarProps) => {
  const score = scoreMeta(completionPercentage);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              Content Score
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {completionPercentage}%
              </span>
              <Badge
                variant="outline"
                className={`rounded-full border-gray-200 px-2 py-0 text-[10px] bg-white dark:border-gray-700 dark:bg-gray-900 ${score.tone}`}
              >
                {score.label}
              </Badge>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-orange-400" />
        </div>

        <Progress
          value={completionPercentage}
          className="mt-2.5 h-1.5 bg-gray-100 dark:bg-gray-800"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          Checklist
        </p>
        <div className="mt-2 space-y-0.5">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onSectionClick?.(section.anchorId)}
              className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <span className="mt-0.5 shrink-0">
                {section.status ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-xs font-medium truncate ${section.status ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  {section.label}
                </span>
                {!section.status && section.errors[0] ? (
                  <span className="block text-[11px] text-red-500 dark:text-red-400 leading-tight truncate">
                    {section.errors[0]}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tips.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/60 p-3 shadow-sm dark:border-gray-800 dark:from-orange-950/20 dark:via-gray-900 dark:to-amber-950/10">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Tips</p>
          <div className="mt-1.5 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {tips.map((tip) => (
              <p key={tip} className="leading-snug">{tip}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFormSidebar;
