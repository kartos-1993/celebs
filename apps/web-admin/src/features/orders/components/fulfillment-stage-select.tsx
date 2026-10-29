import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import {
  getAllowedTransitions,
  ITEM_STATUS_HINTS,
  ITEM_STATUS_LABELS,
} from '../lib/order-constants';
import type { OrderItemStatus, OrderItemUI } from '../types';

interface FulfillmentStageSelectProps {
  item: OrderItemUI;
  newStatus: OrderItemStatus;
  onNewStatusChange: (status: OrderItemStatus) => void;
  isPlatform?: boolean;
}

export function FulfillmentStageSelect({
  item,
  newStatus,
  onNewStatusChange,
  isPlatform = true,
}: FulfillmentStageSelectProps) {
  const allowed = getAllowedTransitions(item.itemStatus, isPlatform);
  const options = allowed.includes(newStatus) ? allowed : [newStatus, ...allowed];

  return (
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
          {options.map((status) => (
            <SelectItem key={status} value={status}>
              {ITEM_STATUS_LABELS[status] ?? status}
              {ITEM_STATUS_HINTS[status] ?? ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
