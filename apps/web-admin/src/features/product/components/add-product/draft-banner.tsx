import { memo } from 'react';
import { FileClock, RotateCcw } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

interface DraftBannerProps {
  restoredDraftAt: string;
  onDiscard: () => void;
}

export const DraftBanner = memo(({ restoredDraftAt, onDiscard }: DraftBannerProps) => (
  <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center">
    <div className="flex items-center gap-3">
      <FileClock className="h-5 w-5 shrink-0 text-warning" />
      <div>
        <p className="text-xs font-semibold text-warning">Saved draft auto-restored</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Loaded unfinished draft saved on {new Date(restoredDraftAt).toLocaleString()}. Note: image
          files must be re-attached before submitting.
        </p>
      </div>
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onDiscard}
      className="h-8 rounded-xl px-3 text-xs"
    >
      <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-warning" />
      Discard Draft & Start Fresh
    </Button>
  </div>
));
