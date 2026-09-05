import { useCallback, useState } from 'react';

import { DEFAULT_COURIER } from '../lib/order-constants';
import type { OrderItemStatus, OrderItemUI } from '../types';

export function useFulfillmentDialog() {
  const [selectedItem, setSelectedItem] = useState<OrderItemUI | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderItemStatus>('PACKED');
  const [courier, setCourier] = useState(DEFAULT_COURIER);
  const [trackingNo, setTrackingNo] = useState('');

  const openFor = useCallback((item: OrderItemUI) => {
    setSelectedItem(item);
    setNewStatus(
      item.itemStatus === 'DELIVERED' || item.itemStatus === 'CANCELLED'
        ? item.itemStatus
        : 'PACKED',
    );
    setCourier(item.courierPartner || DEFAULT_COURIER);
    setTrackingNo(item.trackingNumber || '');
    setIsOpen(true);
  }, []);

  const applyDispatchResult = useCallback((tracking: string) => {
    if (tracking) setTrackingNo(tracking);
    setCourier(DEFAULT_COURIER);
    setNewStatus('HANDED_OVER');
  }, []);

  return {
    selectedItem,
    isOpen,
    setIsOpen,
    newStatus,
    setNewStatus,
    courier,
    setCourier,
    trackingNo,
    setTrackingNo,
    openFor,
    applyDispatchResult,
  };
}

export type FulfillmentDialogState = ReturnType<typeof useFulfillmentDialog>;
