import React, { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@celebs/shared-ui/components/dialog';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ExternalLink,
  RefreshCw,
  Send,
  DollarSign,
} from 'lucide-react';
import { dispatch3PLOrderMutationFn, settleCodOrderMutationFn } from '@/lib/api';

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
  const [newStatus, setNewStatus] = useState<'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED'>(
    'PACKED',
  );
  const [courier, setCourier] = useState<string>('Upaya Logistics');
  const [trackingNo, setTrackingNo] = useState<string>('');

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
    setNewStatus(
      item.itemStatus === 'PENDING'
        ? 'PACKED'
        : item.itemStatus === 'PACKED'
          ? 'HANDED_OVER'
          : 'DELIVERED',
    );
    setCourier(item.courierPartner || 'Upaya Logistics');
    setTrackingNo(item.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`);
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
              paymentStatus: newStatus === 'DELIVERED' ? 'COMPLETED' : item.paymentStatus,
            }
          : item,
      ),
    );

    setIsDialogOpen(false);
  };

  const handleDispatch3PL = async () => {
    if (!selectedItem) return;
    try {
      const res = await dispatch3PLOrderMutationFn({
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
      console.error('3PL Dispatch error:', err);
    }
  };

  const handleSettleCOD = async () => {
    if (!selectedItem) return;
    try {
      await settleCodOrderMutationFn({
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
      console.error('COD settlement error:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            📥 Needs Packing
          </span>
        );
      case 'PACKED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            📦 Packed & Ready
          </span>
        );
      case 'HANDED_OVER':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
            🚚 In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            ✅ Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            ❌ Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Vendor Order Fulfillment
          </h1>
          <p className="text-sm text-gray-500">
            Pick, pack, attach tracking codes, and dispatch incoming orders across Nepal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOrders([...INITIAL_ORDERS])}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Reset Demo
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PENDING', label: '📥 Needs Packing' },
            { id: 'PACKED', label: '📦 Ready for Courier' },
            { id: 'HANDED_OVER', label: '🚚 In Transit' },
            { id: 'DELIVERED', label: '✅ Delivered' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search order #, customer, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="text-xs font-semibold text-gray-700">Order #</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">
                Customer & Address
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">
                Product & Variant
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">
                Amount & Payment
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No orders found in this status category.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((ord) => (
                <TableRow key={ord.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    {ord.orderNumber}
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-medium text-gray-900">{ord.customerName}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      {ord.cityArea}, {ord.provinceDistrict}
                    </div>
                    <div className="text-[10px] text-gray-400">{ord.customerPhone}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-medium text-gray-900">{ord.productName}</div>
                    <div className="text-[11px] text-gray-500">
                      Color:{' '}
                      <span className="font-medium text-gray-700">{ord.colorVariantName}</span> |
                      Size: <span className="font-medium text-gray-700">{ord.size}</span> | Qty:{' '}
                      {ord.quantity}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-slate-900">
                      NPR {ord.totalAmount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-semibold">
                        {ord.paymentMethod}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${ord.paymentStatus === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(ord.itemStatus)}
                    {ord.trackingNumber && (
                      <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-purple-600" />
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
              <Package className="w-5 h-5 text-indigo-600" />
              Fulfill Order #{selectedItem?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update item fulfillment stage and attach courier tracking label.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* Product Info Box */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">{selectedItem.productName}</div>
                <div className="text-slate-600">
                  Variant:{' '}
                  <span className="font-medium text-slate-900">
                    {selectedItem.colorVariantName}
                  </span>{' '}
                  | Size: <span className="font-medium text-slate-900">{selectedItem.size}</span> |
                  Qty: {selectedItem.quantity}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Shipping to: {selectedItem.customerName} ({selectedItem.cityArea},{' '}
                  {selectedItem.provinceDistrict})
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Update Fulfillment Stage</Label>
                <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
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
                <Label className="text-xs font-semibold">Courier / Logistics Partner</Label>
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
                <Label className="text-xs font-semibold">Tracking Number / Airway Bill</Label>
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
                    className="text-xs h-9 gap-1.5 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  >
                    <Send className="w-3.5 h-3.5" />
                    3PL Dispatch
                  </Button>
                </div>
              </div>

              {/* COD Settlement Option */}
              {selectedItem.paymentMethod === 'COD' && selectedItem.paymentStatus === 'PENDING' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-900">Cash on Delivery Pending</div>
                    <div className="text-[11px] text-amber-700">
                      Reconcile 3PL courier bank deposit.
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSettleCOD}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
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
            <Button
              size="sm"
              onClick={handleSaveFulfillment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
