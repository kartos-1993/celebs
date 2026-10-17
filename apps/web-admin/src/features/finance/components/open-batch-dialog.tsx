import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

import { useOpenSettlement } from '../hooks/use-settlement-mutations';

import { useToast } from '@/hooks/use-toast';

interface OpenBatchDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_COURIER = 'PATHAO';

/**
 * Dialog to open a new courier settlement batch.
 *
 * One batch per courier per period. The backend calculates expected collection
 * and expected fees across orders within the specified date window.
 */
export function OpenBatchDialog({ open, onClose }: OpenBatchDialogProps) {
  const { toast } = useToast();
  const openSettlement = useOpenSettlement();

  const [courier, setCourier] = useState(DEFAULT_COURIER);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [reference, setReference] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courier || !periodStart || !periodEnd) return;

    openSettlement.mutate(
      {
        courier,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast({ title: 'Settlement batch opened' });
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : null)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Open Settlement Batch</DialogTitle>
          <DialogDescription>
            Open a billing period for courier reconciliation and ledger comparison.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="courier-select">Courier</Label>
            <Input
              id="courier-select"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="e.g. PATHAO, MANUAL"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period-start">Period Start</Label>
            <Input
              id="period-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period-end">Period End</Label>
            <Input
              id="period-end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="statement-ref">Reference (Optional)</Label>
            <Input
              id="statement-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. STMT-2026-10"
            />
          </div>

          {openSettlement.error instanceof Error ? (
            <p className="text-sm font-medium text-destructive">{openSettlement.error.message}</p>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={openSettlement.isPending || !periodStart || !periodEnd}>
              {openSettlement.isPending ? 'Opening...' : 'Open batch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
