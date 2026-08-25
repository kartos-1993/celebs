import React, { useMemo, useState } from 'react';
import { DollarSign, MapPin, Package, Search, Send, ShoppingCart, Truck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { can, Permission } from '@celebs/rbac';

import { useAuthContext } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';

import {
  dispatch3PLOrder,
  getAdminOrders,
  getVendorOrders,
  mapAdminOrdersToRows,
  mapVendorItemsToRows,
  ORDERS_QUERY_KEYS,
  settleCodOrder,
  updateOrderItemStatusApi,
  type AdminOrdersResponse,
  type OrderItemStatus,
  type OrderItemUI,
  type VendorOrdersResponse,
} from '../api';

const PAGE_LIMIT = 10;

const VENDOR_STATUS_TABS = [
  { id: 'ALL', label: 'All Items' },
  { id: 'PENDING', label: 'Needs Packing' },
  { id: 'PACKED', label: 'Ready for Courier' },
  { id: 'HANDED_OVER', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const ADMIN_ORDER_STATUS_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'HANDED_OVER', label: 'Handed Over' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: 'Needs Packing',
  PACKED: 'Packed & Ready',
  HANDED_OVER: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** Allowed next stages per current stage — backend remains authoritative. */
const ALLOWED_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ['PACKED', 'CANCELLED'],
  PACKED: ['HANDED_OVER', 'CANCELLED'],
  HANDED_OVER: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

type Mode = 'vendor' | 'admin';

const Orders: React.FC = () => {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Vendors (and staff attached to a vendor profile) fulfill their own items;
  // platform admins see every order flattened to item rows.
  const mode: Mode = user?.vendorProfile?.id ? 'vendor' : 'admin';

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const statusParam = activeTab === 'ALL' ? undefined : activeTab;
  const queryParams = { status: statusParam, page, limit: PAGE_LIMIT };

  const listQuery = useQuery<VendorOrdersResponse | AdminOrdersResponse>({
    queryKey:
      mode === 'vendor'
        ? ORDERS_QUERY_KEYS.vendor(queryParams)
        : ORDERS_QUERY_KEYS.admin(queryParams),
    queryFn: () =>
      mode === 'vendor' ? getVendorOrders(queryParams) : getAdminOrders(queryParams),
  });

  const rows = useMemo<OrderItemUI[]>(() => {
    const data = listQuery.data;
    if (!data) return [];
    return 'items' in data.data
      ? mapVendorItemsToRows(data.data.items)
      : mapAdminOrdersToRows(data.data.orders);
  }, [listQuery.data]);

  const total = listQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const filteredRows = rows.filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.productName.toLowerCase().includes(q) ||
      ord.cityArea.toLowerCase().includes(q)
    );
  });

  // Fulfillment dialog state
  const [selectedItem, setSelectedItem] = useState<OrderItemUI | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<OrderItemStatus>('PACKED');
  const [courier, setCourier] = useState<string>('Nepal Can Move');
  const [trackingNo, setTrackingNo] = useState<string>('');

  const canManage = can(user?.role ?? '', Permission.ORDER_MANAGE, user?.permissions);
  const canSettleFinance = can(user?.role ?? '', Permission.FINANCE_MANAGE, user?.permissions);

  const activeListKey =
    mode === 'vendor'
      ? ORDERS_QUERY_KEYS.vendor(queryParams)
      : ORDERS_QUERY_KEYS.admin(queryParams);

  const fulfillmentMutation = useMutation({
    mutationFn: () =>
      updateOrderItemStatusApi(selectedItem!.id, {
        itemStatus: newStatus,
        ...(trackingNo ? { trackingNumber: trackingNo } : {}),
        ...(courier ? { courierPartner: courier } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeListKey });
      setIsDialogOpen(false);
      toast({ title: 'Fulfillment updated', description: `Item moved to ${newStatus}.` });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update fulfillment',
        description: err?.message || 'Please try again later.',
      });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: () => dispatch3PLOrder({ orderId: selectedItem!.orderId }),
    onSuccess: (res: { data?: { trackingNumber?: string; provider?: string } }) => {
      const tracking = res?.data?.trackingNumber || '';
      setCourier('Nepal Can Move');
      if (tracking) setTrackingNo(tracking);
      setNewStatus('HANDED_OVER');
      toast({
        title: 'Dispatched to courier',
        description: tracking ? `Tracking: ${tracking}` : 'Handover recorded.',
      });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: '3PL dispatch failed',
        description: err?.message || 'Please try again later.',
      });
    },
  });

  const settleCodMutation = useMutation({
    mutationFn: () => settleCodOrder({ orderId: selectedItem!.orderId, reference: `VOUCHER-${Date.now()}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeListKey });
      setIsDialogOpen(false);
      toast({ title: 'COD settled', description: 'Courier remittance recorded.' });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'COD settlement failed',
        description: err?.message || 'Please try again later.',
      });
    },
  });

  const handleOpenFulfillModal = (item: OrderItemUI) => {
    setSelectedItem(item);
    setNewStatus(item.itemStatus === 'DELIVERED' || item.itemStatus === 'CANCELLED' ? item.itemStatus : 'PACKED');
    setCourier(item.courierPartner || 'Nepal Can Move');
    setTrackingNo(item.trackingNumber || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: OrderItemStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">{ITEM_STATUS_LABELS.PENDING}</Badge>;
      case 'PACKED':
        return <Badge variant="info">{ITEM_STATUS_LABELS.PACKED}</Badge>;
      case 'HANDED_OVER':
        return <Badge variant="info">{ITEM_STATUS_LABELS.HANDED_OVER}</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">{ITEM_STATUS_LABELS.DELIVERED}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{ITEM_STATUS_LABELS.CANCELLED}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs = mode === 'vendor' ? VENDOR_STATUS_TABS : ADMIN_ORDER_STATUS_TABS;

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'vendor' ? 'Vendor Order Fulfillment' : 'Platform Orders'}
        description={
          mode === 'vendor'
            ? 'Pick, pack, attach tracking codes, and dispatch incoming orders across Nepal.'
            : 'Monitor and reconcile every order placed across the marketplace.'
        }
      />

      {/* Status tabs & search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, customer, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Orders Table */}
      <CardWrapper isFetching={listQuery.isFetching}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Order #</TableHead>
              <TableHead>Customer &amp; Address</TableHead>
              <TableHead>Product &amp; Variant</TableHead>
              <TableHead>Amount &amp; Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    Loading orders…
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<ShoppingCart className="h-8 w-8" />}
                    title="No orders found"
                    description="No orders match this status filter yet."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((ord) => (
                <TableRow key={ord.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {ord.orderNumber}
                    <div className="text-xs text-muted-foreground font-sans mt-0.5">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-medium text-foreground">{ord.customerName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-destructive shrink-0" />
                      {ord.cityArea}, {ord.provinceDistrict}
                    </div>
                    <div className="text-xs text-muted-foreground">{ord.customerPhone}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-medium text-foreground">{ord.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      Color:{' '}
                      <span className="font-medium text-foreground">{ord.colorVariantName}</span> |{' '}
                      Size: <span className="font-medium text-foreground">{ord.size}</span> | Qty:{' '}
                      {ord.quantity}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-foreground text-right">
                      Rs. {ord.totalAmount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-semibold">
                        {ord.paymentMethod}
                      </span>
                      <span
                        className={`text-xs font-medium ${ord.paymentStatus === 'COMPLETED' ? 'text-success' : 'text-warning'}`}
                      >
                        {ord.paymentStatus === 'COMPLETED' ? 'Paid' : 'Payment Pending'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(ord.itemStatus)}
                    {ord.trackingNumber && (
                      <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-info" />
                        {ord.courierPartner}: {ord.trackingNumber}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={ord.itemStatus === 'PENDING' ? 'default' : 'outline'}
                      className="text-xs h-8"
                      onClick={() => handleOpenFulfillModal(ord)}
                    >
                      {mode === 'vendor'
                        ? ord.itemStatus === 'PENDING'
                          ? 'Pack Order'
                          : 'Update Status'
                        : 'View / Update'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardWrapper>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredRows.length} of {total} {mode === 'vendor' ? 'items' : 'orders'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || listQuery.isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || listQuery.isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Pick, Pack & Ship Fulfillment Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Fulfill Order #{selectedItem?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update item fulfillment stage and attach courier tracking label.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-1">
                <div className="font-semibold text-foreground">{selectedItem.productName}</div>
                <div className="text-muted-foreground">
                  Variant:{' '}
                  <span className="font-medium text-foreground">
                    {selectedItem.colorVariantName}
                  </span>{' '}
                  | Size: <span className="font-medium text-foreground">{selectedItem.size}</span> |
                  Qty: {selectedItem.quantity}
                </div>
                <div className="text-muted-foreground text-xs">
                  Shipping to: {selectedItem.customerName} ({selectedItem.cityArea},{' '}
                  {selectedItem.provinceDistrict})
                </div>
              </div>

              {canManage && selectedItem.itemStatus !== 'DELIVERED' && selectedItem.itemStatus !== 'CANCELLED' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Update Fulfillment Stage</Label>
                    <Select
                      value={newStatus}
                      onValueChange={(val: string) => setNewStatus(val as OrderItemStatus)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOWED_TRANSITIONS[selectedItem.itemStatus].map((status) => (
                          <SelectItem key={status} value={status}>
                            {ITEM_STATUS_LABELS[status]}
                            {status === 'PACKED' && ' (Item boxed & sealed)'}
                            {status === 'HANDED_OVER' && ' (Scanned by Courier)'}
                            {status === 'DELIVERED' && ' (Received by Customer)'}
                            {status === 'CANCELLED' && ' (Out of stock / Cancelled)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(newStatus === 'PACKED' || newStatus === 'HANDED_OVER') && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Courier / Logistics Partner</Label>
                        <Select value={courier} onValueChange={setCourier}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Select courier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Upaya Logistics">Upaya Logistics</SelectItem>
                            <SelectItem value="Nepal Can Move">Nepal Can Move</SelectItem>
                            <SelectItem value="PATHAO">Pathao Courier</SelectItem>
                            <SelectItem value="MANUAL">Manual / Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Tracking Number / Airway Bill</Label>
                        <div className="flex gap-2">
                          <Input
                            value={trackingNo}
                            onChange={(e) => setTrackingNo(e.target.value)}
                            placeholder="e.g. NCM-98214-NP"
                            className="text-xs h-9 font-mono flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-9 gap-1.5"
                            disabled={!canManage || dispatchMutation.isPending || newStatus !== 'HANDED_OVER'}
                            onClick={() => dispatchMutation.mutate()}
                          >
                            {dispatchMutation.isPending ? (
                              <Spinner size="sm" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {dispatchMutation.isPending ? 'Dispatching…' : '3PL Dispatch'}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Dispatch hands the parcel to Nepal Can Move via 3PL and records the
                          handover.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              {selectedItem.paymentMethod === 'COD' &&
                selectedItem.paymentStatus === 'PENDING' &&
                canSettleFinance && (
                  <div className="p-3 bg-warning/10 rounded-lg border border-warning/20 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-warning">Cash on Delivery Pending</div>
                      <div className="text-xs text-warning/90">
                        Reconcile 3PL courier bank deposit.
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => settleCodMutation.mutate()}
                      disabled={settleCodMutation.isPending}
                      className="text-xs h-8 gap-1"
                    >
                      {settleCodMutation.isPending ? (
                        <Spinner size="sm" />
                      ) : (
                        <DollarSign className="w-3.5 h-3.5" />
                      )}
                      Settle COD
                    </Button>
                  </div>
                )}
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {canManage &&
              selectedItem &&
              selectedItem.itemStatus !== 'DELIVERED' &&
              selectedItem.itemStatus !== 'CANCELLED' && (
                <Button
                  size="sm"
                  onClick={() => fulfillmentMutation.mutate()}
                  disabled={fulfillmentMutation.isPending}
                >
                  {fulfillmentMutation.isPending ? <Spinner size="sm" /> : null}
                  Save & Notify Customer
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function CardWrapper({
  isFetching,
  children,
}: {
  isFetching: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border bg-card shadow-sm transition-opacity ${
        isFetching ? 'opacity-60' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default Orders;
