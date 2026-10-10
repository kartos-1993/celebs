import { Badge } from '@celebs/shared-ui/components/badge';

import type { OrderItemUI } from '../types';

import { cn } from '@/lib/utils';

interface PaymentCellProps {
  row: OrderItemUI;
}

export function PaymentCell({ row }: PaymentCellProps) {
  return (
    <div className="space-y-0.5">
      <div className="font-mono text-xs tabular-nums">Rs. {row.totalAmount.toLocaleString()}</div>
      <div className="flex items-center gap-1 whitespace-nowrap">
        <Badge variant="secondary">{row.paymentMethod}</Badge>
        <span
          className={cn(
            'whitespace-nowrap text-xs font-medium',
            row.paymentStatus === 'COMPLETED' ? 'text-success' : 'text-warning',
          )}
        >
          {row.paymentStatus === 'COMPLETED' ? 'Paid' : 'Payment Pending'}
        </span>
      </div>
    </div>
  );
}
