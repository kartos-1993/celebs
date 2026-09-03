import { MapPin, ShoppingCart, Truck } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

import type { OrderItemUI } from '../api';
import type { Mode } from '../types';

import { OrderStatusBadge } from './order-status-badge';

import { cn } from '@/lib/utils';

interface OrderCardsProps {
  rows: OrderItemUI[];
  isLoading: boolean;
  isFetching: boolean;
  mode: Mode;
  onUpdate: (item: OrderItemUI) => void;
}

export function OrderCards({ rows, isLoading, isFetching, mode, onUpdate }: OrderCardsProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground md:hidden">
        Loading orders…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState
          icon={<ShoppingCart aria-hidden="true" className="h-8 w-8" />}
          title="No orders found"
          description="No orders match this status filter yet."
        />
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-3 transition-opacity md:hidden', isFetching && 'opacity-60')}
      aria-busy={isFetching}
    >
      {rows.map((ord) => (
        <Card key={ord.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-xs font-semibold text-foreground">
                {ord.orderNumber}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {new Date(ord.createdAt).toLocaleDateString()}
              </div>
            </div>
            <OrderStatusBadge status={ord.itemStatus} />
          </div>

          <div>
            <div className="text-sm font-medium text-foreground">{ord.customerName}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="h-3 w-3 shrink-0 text-destructive" />
              {ord.cityArea}, {ord.provinceDistrict}
            </div>
            <div className="text-xs text-muted-foreground">{ord.customerPhone}</div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="text-sm font-medium text-foreground">{ord.productName}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {ord.colorVariantName} · Size {ord.size} · Qty {ord.quantity}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-foreground">
              Rs. {ord.totalAmount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="font-mono">
                {ord.paymentMethod}
              </Badge>
              <span
                className={cn(
                  'text-xs font-medium',
                  ord.paymentStatus === 'COMPLETED' ? 'text-success' : 'text-warning',
                )}
              >
                {ord.paymentStatus === 'COMPLETED' ? 'Paid' : 'Payment Pending'}
              </span>
            </div>
          </div>

          {ord.trackingNumber && (
            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Truck aria-hidden="true" className="h-3 w-3 text-info" />
              {ord.courierPartner}: {ord.trackingNumber}
            </div>
          )}

          <Button
            className="h-10 w-full"
            variant={ord.itemStatus === 'PENDING' ? 'default' : 'outline'}
            onClick={() => onUpdate(ord)}
          >
            {mode === 'vendor'
              ? ord.itemStatus === 'PENDING'
                ? 'Pack Order'
                : 'Update Status'
              : 'View / Update'}
          </Button>
        </Card>
      ))}
    </div>
  );
}
