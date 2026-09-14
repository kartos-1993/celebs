import { DollarSign } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import type { CodSettlementSectionProps } from './fulfillment-dialog.types';

export function CodSettlementSection({
  paymentReference,
  onReferenceChange,
  settlePending,
  paymentPending,
  onSettle,
}: CodSettlementSectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning/20 bg-warning/10 p-3">
      <div>
        <Badge variant="warning">Cash on Delivery Pending</Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          Reconcile 3PL courier bank deposit before settling.
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cod-reference">Bank deposit slip / voucher no.</Label>
        <Input
          id="cod-reference"
          value={paymentReference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="e.g. NCM-SETTLE-0421"
          className="font-mono"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onSettle}
        disabled={settlePending || paymentPending}
        className="gap-1 sm:self-end"
      >
        {settlePending ? (
          <Spinner size="sm" />
        ) : (
          <DollarSign aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        Settle COD
      </Button>
    </div>
  );
}
