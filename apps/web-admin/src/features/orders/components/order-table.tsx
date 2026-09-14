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
    <>
      <div className="font-mono text-sm tabular-nums">Rs. {row.totalAmount.toLocaleString()}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <Badge variant="secondary" className="font-mono">
          {row.paymentMethod}
        </Badge>
        <span
          className={cn(
            'text-xs font-medium',
            row.paymentStatus === 'COMPLETED' ? 'text-success' : 'text-warning',
          )}
        >
          {row.paymentStatus === 'COMPLETED' ? 'Paid' : 'Payment Pending'}
        </span>
      </div>
    </>
  );
}

export function OrderTable({ rows, isLoading, isFetching, mode, onUpdate }: OrderTableProps) {
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6}>
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Loading orders…
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
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
                <TableCell className="font-mono text-sm tabular-nums">
                  {ord.orderNumber}
                  <div className="mt-0.5 font-sans text-xs font-normal text-muted-foreground">
                    {new Date(ord.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-foreground">{ord.customerName}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin aria-hidden="true" className="h-3 w-3 shrink-0 text-destructive" />
                    {ord.cityArea}, {ord.provinceDistrict}
                  </div>
                  <div className="text-xs text-muted-foreground">{ord.customerPhone}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-foreground">{ord.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    Color:{' '}
                    <span className="font-medium text-foreground">{ord.colorVariantName}</span> |
                    Size: <span className="font-medium text-foreground">{ord.size}</span> | Qty:{' '}
                    <span className="font-mono tabular-nums">{ord.quantity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <PaymentCell row={ord} />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={ord.itemStatus} />
                  {ord.trackingNumber && (
                    <div className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Truck aria-hidden="true" className="h-3 w-3 text-info" />
                      {ord.courierPartner}: {ord.trackingNumber}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
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
