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

import { CodSettlementSection } from './cod-settlement-section';
import { CourierHandoverFields } from './courier-handover-fields';
import type { FulfillmentDialogProps } from './fulfillment-dialog.types';
import { FulfillmentStageSelect } from './fulfillment-stage-select';
import { OrderSummaryCard } from './order-summary-card';
import { PrepaidPaymentSection } from './prepaid-payment-section';

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
  paymentReference,
  onReferenceChange,
  canManage,
  canSettleFinance,
  fulfillmentPending,
  dispatchPending,
  settlePending,
  paymentPending,
  onFulfill,
  onDispatch,
  onSettle,
  onMarkPaid,
  onMarkFailed,
}: FulfillmentDialogProps) {
  const canEdit =
    canManage && item && item.itemStatus !== 'DELIVERED' && item.itemStatus !== 'CANCELLED';
  const showCourierFields = canEdit && (newStatus === 'PACKED' || newStatus === 'HANDED_OVER');
  const showCodBlock =
    item?.paymentMethod === 'COD' && item?.paymentStatus === 'PENDING' && canSettleFinance;
  const showPrepaidBlock =
    item?.paymentMethod !== 'COD' && item?.paymentStatus === 'PENDING' && canSettleFinance;

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
            <OrderSummaryCard item={item} />

            {canEdit && (
              <>
                <FulfillmentStageSelect
                  item={item}
                  newStatus={newStatus}
                  onNewStatusChange={onNewStatusChange}
                />

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

            {showCodBlock && (
              <CodSettlementSection
                paymentReference={paymentReference}
                onReferenceChange={onReferenceChange}
                settlePending={settlePending}
                paymentPending={paymentPending}
                onSettle={onSettle}
              />
            )}

            {showPrepaidBlock && (
              <PrepaidPaymentSection
                paymentMethod={item.paymentMethod}
                paymentReference={paymentReference}
                onReferenceChange={onReferenceChange}
                paymentPending={paymentPending}
                onMarkPaid={onMarkPaid}
                onMarkFailed={onMarkFailed}
              />
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
