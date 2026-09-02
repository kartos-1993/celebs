import { Badge } from '@celebs/shared-ui/components/badge';
import { DialogDescription, DialogHeader, DialogTitle } from '@celebs/shared-ui/components/dialog';

import { cn } from '@/lib/utils';

interface Props {
  quotaPct: number | null;
  selectedCount: number;
  maxSelect: number;
}

export function MediaPickerHeader({ quotaPct, selectedCount, maxSelect }: Props) {
  return (
    <DialogHeader className="shrink-0 space-y-0 border-b border-border/50 p-4 pb-3">
      <div className="flex items-center justify-between gap-4 pr-8">
        <div className="min-w-0">
          <DialogTitle className="text-base font-semibold">Media Library</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
            Pick from your cloud library or upload new images.
          </DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof quotaPct === 'number' && (
            <span
              className={cn(
                'hidden text-xs text-muted-foreground sm:inline',
                quotaPct > 90 && 'font-medium text-warning',
              )}
              title="Storage used"
            >
              Storage {quotaPct}%
            </span>
          )}
          <Badge variant="secondary" className="text-xs font-normal tabular-nums">
            {selectedCount} / {maxSelect}
          </Badge>
        </div>
      </div>
    </DialogHeader>
  );
}
