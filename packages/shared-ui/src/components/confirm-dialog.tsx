import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

import { cn } from '../lib/utils';

import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Spinner } from './spinner';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm action in the destructive (red) style */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Standard app-wide confirmation dialog. Replaces native window.confirm.
 * The dialog closes when `onConfirm` resolves; if it throws, the dialog
 * stays open so callers can surface the error (e.g. via toast).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = React.useState(false);
  const busy = loading || isPending;

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Caller owns error surfacing (toast/inline); keep dialog open
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md" style={{ maxWidth: '28rem' }}>
        <DialogHeader
          className="min-w-0 space-y-0"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          <div className="mb-1 flex items-start gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
              )}
            >
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <DialogTitle className="min-w-0 pt-1.5 text-base font-semibold leading-snug">
              {title}
            </DialogTitle>
          </div>
          {description ? (
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="flex-row flex-wrap gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {busy ? (
              <>
                <Spinner size="sm" className="mr-1.5" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
