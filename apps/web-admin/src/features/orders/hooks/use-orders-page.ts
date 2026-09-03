import { useCallback, useState } from 'react';

import { can, Permission } from '@celebs/rbac';

import type { OrderItemStatus } from '../api';
import type { Mode } from '../types';

import { useFulfillmentDialog } from './use-fulfillment-dialog';
import {
  useDispatch3PLMutation,
  useSettleCodMutation,
  useUpdateFulfillmentMutation,
} from './use-fulfillment-mutations';
import { useOrdersList } from './use-orders-list';

import { useAuthContext } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';

export function useOrdersPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const mode: Mode = user?.vendorProfile?.id ? 'vendor' : 'admin';

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const list = useOrdersList({ mode, activeTab, page, searchQuery });
  const dialog = useFulfillmentDialog();

  const canManage = can(user?.role ?? '', Permission.ORDER_MANAGE, user?.permissions);
  const canSettleFinance = can(user?.role ?? '', Permission.FINANCE_MANAGE, user?.permissions);

  const fulfillmentMutation = useUpdateFulfillmentMutation(list.activeListKey, {
    onSuccess: () => {
      dialog.setIsOpen(false);
      toast({
        title: 'Fulfillment updated',
        description: `Item moved to ${dialog.newStatus}.`,
      });
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Failed to update fulfillment',
        description: err?.message || 'Please try again later.',
      }),
  });

  const dispatchMutation = useDispatch3PLMutation({
    onSuccess: (res) => {
      const tracking = res?.data?.trackingNumber || '';
      dialog.applyDispatchResult(tracking);
      toast({
        title: 'Dispatched to courier',
        description: tracking ? `Tracking: ${tracking}` : 'Handover recorded.',
      });
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: '3PL dispatch failed',
        description: err?.message || 'Please try again later.',
      }),
  });

  const settleCodMutation = useSettleCodMutation(list.activeListKey, {
    onSuccess: () => {
      dialog.setIsOpen(false);
      toast({ title: 'COD settled', description: 'Courier remittance recorded.' });
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'COD settlement failed',
        description: err?.message || 'Please try again later.',
      }),
  });

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
    setPage(1);
  }, []);

  const handleFulfill = useCallback(() => {
    if (!dialog.selectedItem) return;
    fulfillmentMutation.mutate([
      dialog.selectedItem.id,
      {
        itemStatus: dialog.newStatus,
        ...(dialog.trackingNo ? { trackingNumber: dialog.trackingNo } : {}),
        ...(dialog.courier ? { courierPartner: dialog.courier } : {}),
      },
    ]);
  }, [dialog.selectedItem, dialog.newStatus, dialog.trackingNo, dialog.courier, fulfillmentMutation]);

  const handleDispatch = useCallback(() => {
    if (!dialog.selectedItem) return;
    dispatchMutation.mutate(dialog.selectedItem.orderId);
  }, [dialog.selectedItem, dispatchMutation]);

  const handleSettle = useCallback(() => {
    if (!dialog.selectedItem) return;
    settleCodMutation.mutate(dialog.selectedItem.orderId);
  }, [dialog.selectedItem, settleCodMutation]);

  const { setNewStatus } = dialog;
  const handleNewStatusChange = useCallback(
    (status: OrderItemStatus) => setNewStatus(status),
    [setNewStatus],
  );

  return {
    mode,
    activeTab,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    list,
    dialog,
    canManage,
    canSettleFinance,
    fulfillmentMutation,
    dispatchMutation,
    settleCodMutation,
    handleTabChange,
    handleFulfill,
    handleDispatch,
    handleSettle,
    handleNewStatusChange,
  };
}

export type OrdersPageState = ReturnType<typeof useOrdersPage>;
