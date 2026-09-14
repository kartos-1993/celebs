import type { RecentCategory } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';

import { cn } from '@/lib/utils';

interface RecentChipsProps {
  recentCategories: RecentCategory[];
  onSelect: (recent: RecentCategory) => void;
  className?: string;
}

export function RecentChips({ recentCategories, onSelect, className }: RecentChipsProps) {
  if (recentCategories.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="text-muted-foreground">Recently used:</span>
      <div className="flex flex-wrap gap-1.5">
        {recentCategories.slice(0, 5).map((recent) => (
          <Button
            key={recent.id}
            type="button"
            variant="secondary"
            size="sm"
            className="h-auto rounded-full border border-border px-2.5 py-0.5"
            onClick={() => onSelect(recent)}
          >
            {recent.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
