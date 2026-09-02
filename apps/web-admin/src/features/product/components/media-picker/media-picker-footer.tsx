import { Button } from '@celebs/shared-ui/components/button';
import { DialogFooter } from '@celebs/shared-ui/components/dialog';

interface Props {
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MediaPickerFooter({ selectedCount, onCancel, onConfirm }: Props) {
  return (
    <DialogFooter className="shrink-0 items-center justify-between gap-2 border-t border-border/40 bg-muted/20 p-3 sm:justify-between">
      <div className="text-xs text-muted-foreground">
        {selectedCount} image{selectedCount !== 1 ? 's' : ''} selected
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={selectedCount === 0} onClick={onConfirm}>
          Insert {selectedCount > 0 ? `(${selectedCount})` : ''}
        </Button>
      </div>
    </DialogFooter>
  );
}
