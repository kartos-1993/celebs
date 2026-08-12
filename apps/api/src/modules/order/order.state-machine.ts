import { OrderStatus } from '@prisma/client';

import { AppError, ErrorCode,HTTPSTATUS } from '@celebs/shared-utils';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.HANDED_OVER, OrderStatus.CANCELLED],
  HANDED_OVER: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export const canTransition = (currentStatus: OrderStatus, newStatus: OrderStatus): boolean => {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

export const validateTransition = (currentStatus: OrderStatus, newStatus: OrderStatus): void => {
  if (!canTransition(currentStatus, newStatus)) {
    throw new AppError(
      `Invalid order status transition from '${currentStatus}' to '${newStatus}'.`,
      HTTPSTATUS.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
    );
  }
};
