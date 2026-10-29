import { Package } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { CourierHandoverFields } from './courier-handover-fields';
import type { FulfillmentDialogProps } from './fulfillment-dialog.types';
import { FulfillmentStageSelect } from './fulfillment-stage-select';
import { OrderSummaryCard } from './order-summary-card';

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
  isPlatform = true,
  fulfillmentPending,
  dispatchPending,
  onFulfill,
  onDispatch,
}: FulfillmentDialogProps) {
  const canEdit =
    canManage && item && item.itemStatus !== 'DELIVERED' && item.itemStatus !== 'CANCELLED';
  const showCourierFields =
    isPlatform && canEdit && (newStatus === 'PACKED' || newStatus === 'HANDED_OVER');
  const isUnchanged = Boolean(item && newStatus === item.itemStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package aria-hidden="true" className="h-5 w-5 text-primary" />
            Fulfill Order #{item?.orderNumber}
          </DialogTitle>
          <DialogDescription>
            {isPlatform
              ? item?.itemStatus === 'PACKED'
                ? 'Receive package at Kathmandu Central Hub and dispatch via 3PL courier.'
                : 'Update item fulfillment stage and attach courier tracking label.'
              : 'Package order items and update readiness for platform logistics.'}
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-4 py-2">
            <OrderSummaryCard item={item} />

            {canEdit && (
              <>
                <FulfillmentStageSelect
                  item={item}
                  newStatus={newStatus}
                  onNewStatusChange={onNewStatusChange}
                  isPlatform={isPlatform}
                />

                {!isPlatform && item.itemStatus === 'PACKED' && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Parcel is packed and awaiting pickup / handover to Celebs Platform Logistics.
                    3PL courier dispatch and transit updates are managed by the platform.
                  </div>
                )}

                {showCourierFields && (
                  <CourierHandoverFields
                    courier={courier}
                    onCourierChange={onCourierChange}
                    trackingNo={trackingNo}
                    onTrackingChange={onTrackingChange}
                    newStatus={newStatus}
                    canManage={canManage}
                    dispatchPending={dispatchPending}
                    onDispatch={onDispatch}
                  />
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canEdit && (
            <Button onClick={onFulfill} disabled={fulfillmentPending || isUnchanged}>
              {fulfillmentPending ? <Spinner size="sm" /> : null}
              Save &amp; Notify Customer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
