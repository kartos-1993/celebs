import { Badge } from '@celebs/shared-ui/components/badge';

import { ITEM_STATUS_LABELS } from '../lib/order-constants';
import type { OrderItemStatus } from '../types';

export function OrderStatusBadge({ status }: { status: OrderItemStatus }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="warning">{ITEM_STATUS_LABELS.PENDING}</Badge>;
    case 'PACKED':
    case 'HANDED_OVER':
      return <Badge variant="info">{ITEM_STATUS_LABELS[status]}</Badge>;
    case 'DELIVERED':
      return <Badge variant="success">{ITEM_STATUS_LABELS.DELIVERED}</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">{ITEM_STATUS_LABELS.CANCELLED}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
