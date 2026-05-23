import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  return { label: 'Poor', tone: 'text-orange-600', bar: 'bg-orange-500' };
};

const ProductFormSidebar = ({
  completionPercentage,
  onSectionClick,
  sections,
  tips = [],
}: ProductFormSidebarProps) => {
  const score = scoreMeta(completionPercentage);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
              Content Score
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {completionPercentage}%
              </span>
              <Badge
                variant="outline"
                className={`rounded-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${score.tone}`}
              >
                {score.label}
              </Badge>
            </div>
          </div>
          <Sparkles className="h-5 w-5 text-orange-400" />
        </div>

        <Progress
          value={completionPercentage}
          className="mt-4 h-2 bg-gray-100 dark:bg-gray-800"
        />
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Publishing Checklist
        </p>
        <div className="mt-4 space-y-1">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onSectionClick?.(section.anchorId)}
              className="flex w-full items-start gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <span className="mt-0.5">
                {section.status ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-medium ${section.status ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {section.label}
                </span>
                {!section.status && section.errors[0] ? (
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {section.errors[0]}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm dark:border-gray-800 dark:from-orange-950/30 dark:via-gray-900 dark:to-amber-950/20">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tips</p>
        <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {tips.map((tip) => (
            <p key={tip}>{tip}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductFormSidebar;
