import { Send } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
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

import { COURIER_OPTIONS } from '../lib/order-constants';

import type { CourierHandoverFieldsProps } from './fulfillment-dialog.types';

export function CourierHandoverFields({
  courier,
  onCourierChange,
  trackingNo,
  onTrackingChange,
  newStatus,
  canManage,
  dispatchPending,
  onDispatch,
}: CourierHandoverFieldsProps) {
  return (
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
            disabled={!canManage || dispatchPending || newStatus !== 'HANDED_OVER'}
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
          Dispatch hands the parcel to Nepal Can Move via 3PL and records the handover.
        </p>
      </div>
    </>
  );
}
