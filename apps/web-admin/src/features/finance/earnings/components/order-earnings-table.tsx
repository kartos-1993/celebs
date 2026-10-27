import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { formatMoneyAmount } from '@celebs/shared-utils';

import type { OrderEarningsItem } from '../api';
import { formatEntryDate } from '../lib/labels';

interface OrderEarningsTableProps {
  orders: OrderEarningsItem[];
}

export function OrderEarningsTable({ orders }: OrderEarningsTableProps) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders found for this period. Delivered orders will appear here automatically.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-center">Items</TableHead>
          <TableHead className="text-right">Gross</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead className="text-right">VAT (13%)</TableHead>
          <TableHead className="text-right">Net Keep</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.orderId}>
            <TableCell className="font-mono text-xs font-semibold text-foreground">
              {order.orderNumber}
              {order.creditNoteAvailable ? (
                <Badge
                  variant="outline"
                  className="ml-2 border-amber-500/30 text-[10px] text-amber-500"
                >
                  Credit Note
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatEntryDate(order.orderDate)}
            </TableCell>
            <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
              {order.itemCount}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums">
              {formatMoneyAmount(order.grossSales)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              -{formatMoneyAmount(order.commission)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              -{formatMoneyAmount(order.vatOnCommission)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoneyAmount(order.netEarnings)}
            </TableCell>
            <TableCell className="text-center">
              {order.refundStatus === 'FULL' ? (
                <Badge variant="destructive" className="text-[10px]">
                  Refunded
                </Badge>
              ) : order.refundStatus === 'PARTIAL' ? (
                <Badge variant="secondary" className="text-[10px]">
                  Partial Refund
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Settled
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
