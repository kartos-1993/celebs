import { DollarSign, Package, Send } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import type { OrderItemStatus, OrderItemUI } from '../api';
import { ALLOWED_TRANSITIONS, COURIER_OPTIONS, ITEM_STATUS_HINTS, ITEM_STATUS_LABELS } from '../lib/order-constants';

interface FulfillmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OrderItemUI | null;
  newStatus: OrderItemStatus;
  onNewStatusChange: (status: OrderItemStatus) => void;
  courier: string;
  onCourierChange: (courier: string) => void;
  trackingNo: string;
  onTrackingChange: (value: string) => void;
  canManage: boolean;
  canSettleFinance: boolean;
  fulfillmentPending: boolean;
  dispatchPending: boolean;
  settlePending: boolean;
  onFulfill: () => void;
  onDispatch: () => void;
  onSettle: () => void;
}

export function FulfillmentDialog({
  open,
  onOpenChange,
  item,
  newStatus,
  onNewStatusChange,
  courier,
  onCourierChange,
  trackingNo,
  onTrackingChange,
  canManage,
  canSettleFinance,
  fulfillmentPending,
  dispatchPending,
  settlePending,
  onFulfill,
  onDispatch,
  onSettle,
}: FulfillmentDialogProps) {
  const canEdit =
    canManage && item && item.itemStatus !== 'DELIVERED' && item.itemStatus !== 'CANCELLED';
  const showCourierFields = canEdit && (newStatus === 'PACKED' || newStatus === 'HANDED_OVER');
  const showCodBlock =
    item?.paymentMethod === 'COD' && item?.paymentStatus === 'PENDING' && canSettleFinance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package aria-hidden="true" className="h-5 w-5 text-primary" />
            Fulfill Order #{item?.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Update item fulfillment stage and attach courier tracking label.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-4 py-2">
            <div className="space-y-1 rounded-lg border border-border bg-muted/50 p-3">
              <div className="text-sm font-semibold text-foreground">{item.productName}</div>
              <div className="text-sm text-muted-foreground">
                Variant:{' '}
                <span className="font-medium text-foreground">{item.colorVariantName}</span> |
                Size: <span className="font-medium text-foreground">{item.size}</span> | Qty:{' '}
                {item.quantity}
              </div>
              <div className="text-xs text-muted-foreground">
                Shipping to: {item.customerName} ({item.cityArea}, {item.provinceDistrict})
              </div>
            </div>

            {canEdit && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fulfillment-stage">Update Fulfillment Stage</Label>
                  <Select
                    value={newStatus}
                    onValueChange={(val: string) => onNewStatusChange(val as OrderItemStatus)}
                  >
                    <SelectTrigger id="fulfillment-stage">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLOWED_TRANSITIONS[item.itemStatus].map((status) => (
                        <SelectItem key={status} value={status}>
                          {ITEM_STATUS_LABELS[status]}
                          {ITEM_STATUS_HINTS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showCourierFields && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="courier-partner">Courier / Logistics Partner</Label>
                      <Select value={courier} onValueChange={onCourierChange}>
                        <SelectTrigger id="courier-partner">
                          <SelectValue placeholder="Select courier" />
                        </SelectTrigger>
                        <SelectContent>
                          {COURIER_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="tracking-number">Tracking Number / Airway Bill</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="tracking-number"
                          value={trackingNo}
                          onChange={(e) => onTrackingChange(e.target.value)}
                          placeholder="e.g. NCM-98214-NP"
                          className="flex-1 font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            !canManage || dispatchPending || newStatus !== 'HANDED_OVER'
                          }
                          onClick={onDispatch}
                          className="gap-1.5 sm:shrink-0"
                        >
                          {dispatchPending ? (
                            <Spinner size="sm" />
                          ) : (
                            <Send aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                          {dispatchPending ? 'Dispatching…' : '3PL Dispatch'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Dispatch hands the parcel to Nepal Can Move via 3PL and records the
                        handover.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {showCodBlock && (
              <div className="flex flex-col gap-3 rounded-lg border border-warning/20 bg-warning/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge variant="warning">Cash on Delivery Pending</Badge>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Reconcile 3PL courier bank deposit.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSettle}
                  disabled={settlePending}
                  className="gap-1 sm:shrink-0"
                >
                  {settlePending ? (
                    <Spinner size="sm" />
                  ) : (
                    <DollarSign aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  Settle COD
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canEdit && (
            <Button onClick={onFulfill} disabled={fulfillmentPending}>
              {fulfillmentPending ? <Spinner size="sm" /> : null}
              Save &amp; Notify Customer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
