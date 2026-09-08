import type { OrderItemStatus, OrderItemUI } from '../types';

export interface FulfillmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OrderItemUI | null;
  newStatus: OrderItemStatus;
  onNewStatusChange: (status: OrderItemStatus) => void;
  courier: string;
  onCourierChange: (courier: string) => void;
  trackingNo: string;
  onTrackingChange: (value: string) => void;
  paymentReference: string;
  onReferenceChange: (value: string) => void;
  canManage: boolean;
  canSettleFinance: boolean;
  fulfillmentPending: boolean;
  dispatchPending: boolean;
  settlePending: boolean;
  paymentPending: boolean;
  onFulfill: () => void;
  onDispatch: () => void;
  onSettle: () => void;
  onMarkPaid: () => void;
  onMarkFailed: () => void;
}

export interface CourierHandoverFieldsProps {
  courier: string;
  onCourierChange: (courier: string) => void;
  trackingNo: string;
  onTrackingChange: (value: string) => void;
  newStatus: OrderItemStatus;
  canManage: boolean;
  dispatchPending: boolean;
  onDispatch: () => void;
}

export interface CodSettlementSectionProps {
  paymentReference: string;
  onReferenceChange: (value: string) => void;
  settlePending: boolean;
  paymentPending: boolean;
  onSettle: () => void;
}

export interface PrepaidPaymentSectionProps {
  paymentMethod: string;
  paymentReference: string;
  onReferenceChange: (value: string) => void;
  paymentPending: boolean;
  onMarkPaid: () => void;
  onMarkFailed: () => void;
}
