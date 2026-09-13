import { Check } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { DialogFooter } from '@celebs/shared-ui/components/dialog';

interface Props {
  isProcessing: boolean;
  onCancel: () => void;
  onApplyCrop: () => void;
}

export function MediaCropFooter({ isProcessing, onCancel, onApplyCrop }: Props) {
  return (
    <DialogFooter className="flex items-center justify-between border-t border-border/40 bg-muted/20 p-3 px-4">
      <Button variant="outline" size="sm" onClick={onCancel} disabled={isProcessing}>
        Cancel
      </Button>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onApplyCrop} disabled={isProcessing} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          {isProcessing ? 'Saving...' : 'Save new version'}
        </Button>
      </div>
    </DialogFooter>
  );
}
