import { useState } from 'react';
import { Folder } from 'lucide-react';

import type { MediaFolder } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folders: MediaFolder[];
  onMove: (targetFolderId: string | null) => Promise<void>;
  isMoving: boolean;
}

export function MediaMoveDialog({ open, onOpenChange, folders, onMove, isMoving }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2 max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left',
              selected === null ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
            )}
          >
            <Folder className="h-4 w-4" /> All (No folder)
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left',
                selected === f.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
              )}
            >
              <Folder className="h-4 w-4" /> {f.name}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await onMove(selected);
              onOpenChange(false);
            }}
            disabled={isMoving}
          >
            {isMoving ? <Spinner size="sm" className="mr-2" /> : null} Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
