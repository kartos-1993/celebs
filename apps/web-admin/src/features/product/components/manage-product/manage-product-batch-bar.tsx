import React from 'react';
import { Eye, EyeOff, Send, Trash2 } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface ManageProductBatchBarProps {
  selectedCount: number;
  submittableCount: number;
  activatableCount: number;
  deactivatableCount: number;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isBatchProcessing: boolean;
  onSubmit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onOpenArchive: () => void;
  onClear: () => void;
}

export const ManageProductBatchBar: React.FC<ManageProductBatchBarProps> = ({
  selectedCount,
  submittableCount,
  activatableCount,
  deactivatableCount,
  isSellerOrStaff,
  canCreate,
  canEdit,
  canDelete,
  isBatchProcessing,
  onSubmit,
  onActivate,
  onDeactivate,
  onOpenArchive,
  onClear,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/50 p-2 text-xs text-foreground shadow-sm mb-4">
      <span className="font-semibold px-1">{selectedCount} selected</span>

      {isSellerOrStaff && canCreate && submittableCount > 0 && (
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1 px-2.5 text-xs"
          disabled={isBatchProcessing}
          onClick={onSubmit}
        >
          {isBatchProcessing ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />}
          Submit ({submittableCount})
        </Button>
      )}

      {isSellerOrStaff && canEdit && activatableCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 border-success/30 bg-success/10 px-2.5 text-xs text-success hover:bg-success/20"
          disabled={isBatchProcessing}
          onClick={onActivate}
        >
          <Eye className="h-3.5 w-3.5" />
          Activate ({activatableCount})
        </Button>
      )}

      {isSellerOrStaff && canEdit && deactivatableCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 border-warning/30 bg-warning/10 px-2.5 text-xs text-warning hover:bg-warning/20"
          disabled={isBatchProcessing}
          onClick={onDeactivate}
        >
          <EyeOff className="h-3.5 w-3.5" />
          Deactivate ({deactivatableCount})
        </Button>
      )}

      {canDelete && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 border-destructive/30 bg-destructive/10 px-2.5 text-xs text-destructive hover:bg-destructive/20"
          disabled={isBatchProcessing}
          onClick={onOpenArchive}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Archive ({selectedCount})
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onClear}
        disabled={isBatchProcessing}
      >
        Clear
      </Button>
    </div>
  );
};
