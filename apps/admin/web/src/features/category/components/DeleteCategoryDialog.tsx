/**
 * Delete confirmation dialog component
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
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
  category,
}) => {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Delete{' '}
            {category.hasChildren ? 'Category with Children' : 'Category'}?
          </DialogTitle>
          <DialogDescription className="text-red-600 dark:text-red-400">
            {category.name}
          </DialogDescription>
        </DialogHeader>{' '}
        <div className="py-3 space-y-4">
          <div className="space-y-2">
            <p>
              {category.hasChildren ? (
                <>
                  This category has {category.childCount} child{' '}
                  {category.childCount === 1 ? 'category' : 'categories'}.
                  Deleting it will remove:
                </>
              ) : (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-medium">{category.name}</span>? This
                  will remove:
                </>
              )}
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
              {category.hasChildren && (
                <li>All child categories and their attributes</li>
              )}
              {category.attributes && category.attributes.length > 0 && (
                <li>
                  {category.attributes.length}{' '}
                  {category.attributes.length === 1
                    ? 'attribute'
                    : 'attributes'}{' '}
                  ( {category.attributes.map((attr) => attr.name).join(', ')} )
                </li>
              )}
              <li>Any associations with products using this category</li>
            </ul>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-md border border-amber-200 dark:border-amber-900/50">
            <p className="text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This action cannot be undone
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {category.hasChildren
              ? 'Delete Category and Children'
              : 'Delete Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
