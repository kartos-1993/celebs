import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';

interface CategoryChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCategoryName: string;
  onCancel: () => void;
  onProceed: () => void;
}

export function CategoryChangeDialog({
  open,
  onOpenChange,
  pendingCategoryName,
  onCancel,
  onProceed,
}: CategoryChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Category?</DialogTitle>
          <DialogDescription>
            You have already entered product details for this category. Switching will regenerate
            the form schema and may reset category-specific fields. Change to{' '}
            <span className="font-semibold text-foreground">{pendingCategoryName}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onProceed}>
            Change Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
