import { MapPin, ShoppingCart, Truck } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { Mode, OrderItemUI } from '../types';

import { OrderStatusBadge } from './order-status-badge';

import { TableSkeleton } from '@/components/table-skeleton';
import { cn } from '@/lib/utils';

interface OrderTableProps {
  rows: OrderItemUI[];
  isLoading: boolean;
  isFetching: boolean;
  mode: Mode;
  onUpdate: (item: OrderItemUI) => void;
}

function PaymentCell({ row }: { row: OrderItemUI }) {
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

export function OrderTable({ rows, isLoading, isFetching, mode, onUpdate }: OrderTableProps) {
  if (isLoading) {
    return <TableSkeleton rows={8} columns={6} className="hidden md:block" />;
  }

  return (
    <div
      className={cn(
        'hidden overflow-x-auto rounded-xl border bg-card shadow-sm transition-opacity md:block',
        isFetching && 'opacity-60',
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Order #</TableHead>
            <TableHead>Customer &amp; Address</TableHead>
            <TableHead>Product &amp; Variant</TableHead>
            <TableHead>Amount &amp; Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <EmptyState
                  icon={<ShoppingCart aria-hidden="true" className="h-8 w-8" />}
                  title="No orders found"
                  description="No orders match this status filter yet."
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((ord) => (
              <TableRow key={ord.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="font-mono text-xs whitespace-nowrap tabular-nums">
                  {ord.orderNumber}
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    {new Date(ord.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-44 truncate text-sm font-semibold tracking-tight leading-tight text-foreground">
                    {ord.customerName}
                  </div>
                  <div className="mt-0.5 flex max-w-44 items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin aria-hidden="true" className="h-3 w-3 shrink-0 text-destructive" />
                    <span className="truncate">
                      {ord.cityArea}, {ord.provinceDistrict}
                    </span>
                  </div>
                  <div className="max-w-44 truncate text-xs text-muted-foreground">
                    {ord.customerPhone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-56 truncate text-sm font-semibold tracking-tight leading-tight text-foreground">
                    {ord.productName}
                  </div>
                  <div className="max-w-56 truncate text-xs whitespace-nowrap text-muted-foreground">
                    Color:{' '}
                    <span className="font-medium text-foreground">{ord.colorVariantName}</span> |
                    Size: <span className="font-medium text-foreground">{ord.size}</span> | Qty:{' '}
                    <span className="font-mono tabular-nums">{ord.quantity}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <PaymentCell row={ord} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <OrderStatusBadge status={ord.itemStatus} />
                    {ord.trackingNumber && (
                      <div className="flex max-w-40 items-center gap-1 truncate font-mono text-xs text-muted-foreground">
                        <Truck aria-hidden="true" className="h-3 w-3 shrink-0 text-info" />
                        <span className="truncate">
                          {ord.courierPartner}: {ord.trackingNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    className="h-7 whitespace-nowrap px-2 text-xs"
                    variant={ord.itemStatus === 'PENDING' ? 'default' : 'outline'}
                    onClick={() => onUpdate(ord)}
                  >
                    {mode === 'vendor'
                      ? ord.itemStatus === 'PENDING'
                        ? 'Pack Order'
                        : 'Update Status'
                      : 'View / Update'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
