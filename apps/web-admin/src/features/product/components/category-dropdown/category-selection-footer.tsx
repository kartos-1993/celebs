import { Button } from '@celebs/shared-ui/components/button';

interface CategorySelectionFooterProps {
  currentSelectionText: string;
  canConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CategorySelectionFooter({
  currentSelectionText,
  canConfirm,
  onCancel,
  onConfirm,
}: CategorySelectionFooterProps) {
  return (
    <>
      {currentSelectionText && (
        <div className="shrink-0 rounded-lg border bg-muted/50 p-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Current selection: </span>
            <span className="font-semibold text-primary">{currentSelectionText}</span>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between border-t border-border bg-background pt-3">
        <span className="text-xs text-muted-foreground">
          {canConfirm ? 'Ready to confirm selection' : 'Select a final subcategory'}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} size="sm">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            data-testid="category-confirm-btn"
            disabled={!canConfirm}
          >
            Confirm Selection
          </Button>
        </div>
      </div>
    </>
  );
}
