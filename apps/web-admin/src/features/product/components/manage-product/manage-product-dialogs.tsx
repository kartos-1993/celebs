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

import type { ProductListItem } from '../../types';

interface ManageProductDialogsProps {
  archiveTarget: ProductListItem | null;
  onCloseArchiveTarget: () => void;
  onConfirmArchiveTarget: () => void;
  isArchivePending: boolean;
  isBatchArchiveOpen: boolean;
  onCloseBatchArchive: () => void;
  onConfirmBatchArchive: () => void;
  selectedCount: number;
  isBatchProcessing: boolean;
}

export const ManageProductDialogs: React.FC<ManageProductDialogsProps> = ({
  archiveTarget,
  onCloseArchiveTarget,
  onConfirmArchiveTarget,
  isArchivePending,
  isBatchArchiveOpen,
  onCloseBatchArchive,
  onConfirmBatchArchive,
  selectedCount,
  isBatchProcessing,
}) => {
  return (
    <>
      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && onCloseArchiveTarget()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Archive “{archiveTarget?.name}”?
            </DialogTitle>
            <DialogDescription>
              This product will be soft-deleted: it is hidden from the storefront and removed from
              active listings. This action is tracked in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseArchiveTarget} disabled={isArchivePending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isArchivePending || !archiveTarget}
              onClick={onConfirmArchiveTarget}
            >
              {isArchivePending && <Spinner size="sm" className="mr-2" />}
              Archive Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBatchArchiveOpen} onOpenChange={(open) => !open && onCloseBatchArchive()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Archive {selectedCount} Selected Product(s)?
            </DialogTitle>
            <DialogDescription>
              These products will be soft-deleted: they will be hidden from the storefront and
              removed from active listings. This action is tracked in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseBatchArchive} disabled={isBatchProcessing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBatchProcessing || selectedCount === 0}
              onClick={onConfirmBatchArchive}
            >
              {isBatchProcessing && <Spinner size="sm" className="mr-2" />}
              Archive Selected Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
