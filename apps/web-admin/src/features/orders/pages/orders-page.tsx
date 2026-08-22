import React, { useState } from 'react';
import { DollarSign,MapPin, Package, RefreshCw, Search, Send, Truck } from 'lucide-react';

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
import { logger } from '@celebs/shared-utils';

import { dispatch3PLOrder, settleCodOrder } from '../api';

export interface OrderItemUI {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  cityArea: string;
  provinceDistrict: string;
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  itemStatus: 'PENDING' | 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED';
  trackingNumber?: string;
  courierPartner?: string;
  createdAt: string;
}

// Initial mock state for UI staging demonstration
const INITIAL_ORDERS: OrderItemUI[] = [
  {
    id: 'ord_item_101',
    orderNumber: 'CEL-2026-89412',
    customerName: 'Aashish Shrestha',
    customerPhone: '9841234567',
    cityArea: 'New Baneshwor',
    provinceDistrict: 'Bagmati / Kathmandu',
    productName: 'Oversized Streetwear Hoodie',
    colorVariantName: 'Washed Black',
    size: 'L',
    quantity: 1,
    unitPrice: 3499,
    totalAmount: 3499,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    itemStatus: 'PENDING',
    createdAt: '2026-08-03T09:30:00Z',
  },
  {
    id: 'ord_item_102',
    orderNumber: 'CEL-2026-89415',
    customerName: 'Priya Adhikari',
    customerPhone: '9801987654',
    cityArea: 'Jhamsikhel',
    provinceDistrict: 'Bagmati / Lalitpur',
    productName: 'Baggy Fit Vintage Denim',
    colorVariantName: 'Ocean Blue',
    size: 'M',
    quantity: 2,
    unitPrice: 2899,
    totalAmount: 5798,
    paymentMethod: 'STRIPE',
    paymentStatus: 'COMPLETED',
    itemStatus: 'PACKED',
    trackingNumber: 'UPY-98214-NP',
    courierPartner: 'Upaya Logistics',
    createdAt: '2026-08-03T08:15:00Z',
  },
  {
    id: 'ord_item_103',
    orderNumber: 'CEL-2026-89390',
    customerName: 'Subash Nepal',
    customerPhone: '9812341122',
    cityArea: 'Thamel',
    provinceDistrict: 'Bagmati / Kathmandu',
    productName: 'Cropped Linen Shirt',
    colorVariantName: 'Off White',
    size: 'S',
    quantity: 1,
    unitPrice: 1999,
    totalAmount: 1999,
    paymentMethod: 'ESEWA',
    paymentStatus: 'COMPLETED',
    itemStatus: 'HANDED_OVER',
    trackingNumber: 'NCM-77123-KT',
    courierPartner: 'Nepal Can Move',
    createdAt: '2026-08-02T14:20:00Z',
  },
];

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderItemUI[]>(INITIAL_ORDERS);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Order Modal state
  const [selectedItem, setSelectedItem] = useState<OrderItemUI | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Form states for fulfillment update
  const [newStatus, setNewStatus] = useState<OrderItemUI['itemStatus']>('PACKED');
  const [courier, setCourier] = useState<string>('Upaya Logistics');
  const [trackingNo, setTrackingNo] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSettlingCod, setIsSettlingCod] = useState(false);

  const filteredOrders = orders.filter((ord) => {
    const matchesTab = activeTab === 'ALL' || ord.itemStatus === activeTab;
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.cityArea.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleOpenFulfillModal = (item: OrderItemUI) => {
    setSelectedItem(item);
    setNewStatus(item.itemStatus);
    setCourier(item.courierPartner || 'Nepal Can Move');
    setTrackingNo(item.trackingNumber || '');
    setIsDialogOpen(true);
  };

  const handleSaveFulfillment = () => {
    if (!selectedItem) return;
    setOrders((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              itemStatus: newStatus,
              courierPartner: courier,
              trackingNumber: trackingNo,
            }
          : item,
      ),
    );
    setIsDialogOpen(false);
  };

  const handleDispatch3PL = async () => {
    if (!selectedItem || isDispatching) return;
    setIsDispatching(true);
    try {
      const res = await dispatch3PLOrder({
        orderId: selectedItem.id,
        provider: 'NEPAL_CAN_MOVE',
      });
      const tracking =
        res?.data?.trackingNumber || `NCM-${Math.floor(100000 + Math.random() * 900000)}`;
      setCourier('Nepal Can Move');
      setTrackingNo(tracking);
      setNewStatus('HANDED_OVER');
      setOrders((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                itemStatus: 'HANDED_OVER',
                courierPartner: 'Nepal Can Move',
                trackingNumber: tracking,
              }
            : item,
        ),
      );
    } catch (err) {
      logger.error({ error: err }, '3PL Dispatch error');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSettleCOD = async () => {
    if (!selectedItem || isSettlingCod) return;
    setIsSettlingCod(true);
    try {
      await settleCodOrder({
        orderId: selectedItem.id,
        reference: `VOUCHER-${Date.now()}`,
      });
      setOrders((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id ? { ...item, paymentStatus: 'COMPLETED' } : item,
        ),
      );
      setIsDialogOpen(false);
    } catch (err) {
      logger.error({ error: err }, 'COD settlement error');
    } finally {
      setIsSettlingCod(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">📥 Needs Packing</Badge>;
      case 'PACKED':
        return <Badge variant="info">📦 Packed &amp; Ready</Badge>;
      case 'HANDED_OVER':
        return <Badge variant="info">🚚 In Transit</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">✅ Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">❌ Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Vendor Order Fulfillment"
        description="Pick, pack, attach tracking codes, and dispatch incoming orders across Nepal."
        actions={
          <Button variant="outline" size="sm" onClick={() => setOrders([...INITIAL_ORDERS])}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Reset Demo
          </Button>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PENDING', label: '📥 Needs Packing' },
            { id: 'PACKED', label: '📦 Ready for Courier' },
            { id: 'HANDED_OVER', label: '🚚 In Transit' },
            { id: 'DELIVERED', label: '✅ Delivered' },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id)}
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
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
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
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="No orders found in this status category." />
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((ord) => (
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
                      <span className="font-medium text-foreground">{ord.colorVariantName}</span> |
                      Size: <span className="font-medium text-foreground">{ord.size}</span> | Qty:{' '}
                      {ord.quantity}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-foreground">
                      NPR {ord.totalAmount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-semibold">
                        {ord.paymentMethod}
                      </span>
                      <span
                        className={`text-xs font-medium ${ord.paymentStatus === 'COMPLETED' ? 'text-success' : 'text-warning'}`}
                      >
                        {ord.paymentStatus}
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
                      {ord.itemStatus === 'PENDING' ? 'Pack Order' : 'Update Status'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
              {/* Product Info Box */}
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

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label>Update Fulfillment Stage</Label>
                <Select
                  value={newStatus}
                  onValueChange={(val: string) =>
                    setNewStatus(val as 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED')
                  }
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PACKED">📦 PACKED (Item boxed & sealed)</SelectItem>
                    <SelectItem value="HANDED_OVER">🚚 HANDED OVER (Scanned by Courier)</SelectItem>
                    <SelectItem value="DELIVERED">✅ DELIVERED (Received by Customer)</SelectItem>
                    <SelectItem value="CANCELLED">
                      ❌ CANCELLED (Out of stock / Cancelled)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Courier Partner Selection */}
              <div className="space-y-1.5">
                <Label>Courier / Logistics Partner</Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select courier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upaya Logistics">
                      Upaya Logistics (Kathmandu Valley & Express)
                    </SelectItem>
                    <SelectItem value="Nepal Can Move">
                      Nepal Can Move (Nationwide Nepal Delivery)
                    </SelectItem>
                    <SelectItem value="In-House Rider">In-House Celebs Rider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tracking Number Input */}
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
                    onClick={handleDispatch3PL}
                    disabled={isDispatching}
                    className="text-xs h-9 gap-1.5"
                  >
                    {isDispatching ? (
                      <Spinner size="sm" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isDispatching ? 'Dispatching...' : '3PL Dispatch'}
                  </Button>
                </div>
              </div>

              {/* COD Settlement Option */}
              {selectedItem.paymentMethod === 'COD' && selectedItem.paymentStatus === 'PENDING' && (
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
                    onClick={handleSettleCOD}
                    disabled={isSettlingCod}
                    className="text-xs h-8 gap-1"
                  >
                    {isSettlingCod ? (
                      <Spinner size="sm" />
                    ) : (
                      <DollarSign className="w-3.5 h-3.5" />
                    )}
                    {isSettlingCod ? 'Settling...' : 'Settle COD'}
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveFulfillment}
              
            >
              Save & Notify Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
