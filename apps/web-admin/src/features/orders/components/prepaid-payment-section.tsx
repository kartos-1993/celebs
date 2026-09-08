import { DollarSign, XCircle } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import type { PrepaidPaymentSectionProps } from './fulfillment-dialog.types';

export function PrepaidPaymentSection({
  paymentMethod,
  paymentReference,
  onReferenceChange,
  paymentPending,
  onMarkPaid,
  onMarkFailed,
}: PrepaidPaymentSectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-info/20 bg-info/10 p-3">
      <div>
        <Badge variant="secondary">{paymentMethod} Payment Pending</Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          Record the wallet voucher, bank slip, or rejection reason. All actions are audit-logged.
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-reference">Voucher / transaction ID / note</Label>
        <Input
          id="payment-reference"
          value={paymentReference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="e.g. eSewa Txn 0DA8G2E"
          className="font-mono"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          onClick={onMarkPaid}
          disabled={paymentPending}
          className="gap-1"
        >
          {paymentPending ? (
            <Spinner size="sm" />
          ) : (
            <DollarSign aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          Mark Paid
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onMarkFailed}
          disabled={paymentPending}
          className="gap-1"
        >
          <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
          Mark Failed
        </Button>
      </div>
    </div>
  );
}
