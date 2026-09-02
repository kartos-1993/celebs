import { Check, Copy, RefreshCw } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { DialogFooter } from '@celebs/shared-ui/components/dialog';

interface Props {
  isEditingExisting: boolean;
  isProcessing: boolean;
  onCancel: () => void;
  onApplyCrop: (overwrite: boolean) => void;
}

export function MediaCropFooter({ isEditingExisting, isProcessing, onCancel, onApplyCrop }: Props) {
  return (
    <DialogFooter className="flex items-center justify-between border-t border-border/40 bg-muted/20 p-3 px-4">
      <Button variant="outline" size="sm" onClick={onCancel} disabled={isProcessing}>
        Cancel
      </Button>
      <div className="flex items-center gap-2">
        {isEditingExisting ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplyCrop(false)}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Save as Copy
            </Button>
            <Button
              size="sm"
              onClick={() => onApplyCrop(true)}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isProcessing ? 'Updating...' : 'Replace Original'}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => onApplyCrop(false)}
            disabled={isProcessing}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            {isProcessing ? 'Cropping...' : 'Apply 3:4 Crop'}
          </Button>
        )}
      </div>
    </DialogFooter>
  );
}
