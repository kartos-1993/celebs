import { AlertTriangle } from 'lucide-react';

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
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Change Category?</DialogTitle>
          </div>
          {/* The full reset, named in full. "May reset category-specific fields
              and variants" under-warned badly: `resetForNewCategory` also clears
              the basics, every packaging/warranty answer, the parcel
              dimensions, every image and colour/size row with its SKU codes,
              prices and stock, and DELETES the saved draft. Prose only — the
              primitive renders a `<p>`, so a list inside it would be invalid
              nesting. */}
          <DialogDescription className="pt-2 leading-relaxed text-muted-foreground">
            Switching to{' '}
            <span className="font-semibold text-foreground">{pendingCategoryName}</span> clears
            everything you have entered for this product: the name, brand and description; all
            packaging and warranty answers, including the parcel weight and dimensions; every
            product image; and every colour and size row, along with their SKU codes, prices and
            stock. Your saved draft is deleted too, and cannot be recovered.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onProceed}>
            Change Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
