/**
 * Delete confirmation dialog component
 */

import React from 'react';
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
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  category?: {
    name: string;
    hasChildren?: boolean;
    childCount?: number;
    attributes?: Array<{ name: string }>;
  };
}

export const DeleteCategoryDialog: React.FC<DeleteCategoryDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isLoading = false,
  category,
}) => {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Delete {category.name}?
          </DialogTitle>
          <DialogDescription className="text-destructive">
            {category.name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-4">
          <div className="space-y-2">
            {category.hasChildren ? (
              <div className="p-3 bg-warning/10 rounded-md border border-warning/30 space-y-1">
                <p className="text-sm font-semibold text-warning flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Cannot delete category with subcategories
                </p>
                <p className="text-xs text-warning">
                  This category has {category.childCount} subcategory(ies). Please delete or move
                  the subcategories before deleting this parent category.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm">
                  Are you sure you want to delete{' '}
                  <span className="font-medium">{category.name}</span>?
                </p>
                {category.attributes && category.attributes.length > 0 && (
                  <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-muted-foreground">
                    <li>
                      Associated attributes (
                      {category.attributes.map((attr) => attr.name).join(', ')}) will be removed.
                    </li>
                  </ul>
                )}
              </>
            )}
          </div>

          {!category.hasChildren && (
            <div className="p-3 bg-warning/10 rounded-md border border-warning/30">
              <p className="text-xs text-warning flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                This action cannot be undone
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          {!category.hasChildren && (
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
              className="min-w-[130px]"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Category'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
