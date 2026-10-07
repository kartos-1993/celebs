import { ConsignmentStatus, OrderStatus } from '@prisma/client';

/**
 * Translates Pathao's event strings into our statuses.
 *
 * Pathao reports a long tail of events ("order.created", "Payment Invoice",
 * "Store Created" ...) that carry no delivery progress. Those map to null:
 * the event is still recorded on the timeline, but nothing moves. An
 * unrecognised string is also null rather than an error — refusing it would
 * turn every new courier event into a failed delivery in their retry queue.
 */
export function mapPathaoEventToStatus(event: string): OrderStatus | null {
  switch (event.trim().toLowerCase()) {
    case 'delivered':
      return OrderStatus.DELIVERED;
    case 'partial delivery':
    case 'in transit':
    case 'received at last mile hub':
    case 'assigned for delivery':
      return OrderStatus.OUT_FOR_DELIVERY;
    case 'pickup':
    case 'pickup requested':
    case 'assigned for pickup':
    case 'at the sorting hub':
      return OrderStatus.HANDED_OVER;
    case 'return':
    case 'returned to merchant':
    case 'return in transit':
    case 'delivery failed':
    case 'pickup failed':
      return OrderStatus.RETURNED;
    default:
      return null;
  }
}

/**
 * The parcel-level counterpart. A partial delivery leaves the consignment
 * short of delivered: the remainder is still moving, so it stays in transit.
 */
export function mapPathaoEventToConsignmentStatus(event: string): ConsignmentStatus | null {
  switch (mapPathaoEventToStatus(event)) {
    case OrderStatus.DELIVERED:
      return ConsignmentStatus.DELIVERED;
    case OrderStatus.OUT_FOR_DELIVERY:
    case OrderStatus.HANDED_OVER:
      return ConsignmentStatus.HANDED_OVER;
    case OrderStatus.RETURNED:
      return ConsignmentStatus.RETURNED;
    default:
      return null;
  }
}

const CONSIGNMENT_PROGRESS_RANK: Record<ConsignmentStatus, number> = {
  [ConsignmentStatus.CREATED]: 0,
  [ConsignmentStatus.HANDED_OVER]: 1,
  [ConsignmentStatus.DELIVERED]: 2,
  [ConsignmentStatus.RETURNED]: 3,
  [ConsignmentStatus.CANCELLED]: 4,
};

/** Parcels obey the same forward-only rule as orders. */
export function isForwardConsignmentMove(from: ConsignmentStatus, to: ConsignmentStatus): boolean {
  return (CONSIGNMENT_PROGRESS_RANK[from] ?? -1) < (CONSIGNMENT_PROGRESS_RANK[to] ?? -1);
}
