import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@celebs/shared-ui/components/dialog';
import { Button } from '@celebs/shared-ui/components/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@celebs/shared-ui/components/tabs';
import { ScrollArea } from '@celebs/shared-ui/components/scroll-area';

interface Warehouse {
  id: string;
  label?: string;
  contactName?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

interface VendorDetail {
  id: string;
  shopName: string;
  shopDescription?: string;
  phoneNumber: string;
  panNumber: string;
  citizenshipNumber: string;
  panDocumentUrl?: string;
  citizenshipDocumentUrl?: string;
  ownerPhotoUrl?: string;
  vatDocumentUrl?: string;
  businessRegDocumentUrl?: string;
  storeLogo?: string;
  businessName?: string;
  businessRegNumber?: string;
  businessPhoneNumber?: string;
  status: string;
  rejectionReason?: string;
  availableBalance?: string | number;
  createdAt?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    isEmailVerified?: boolean;
    createdAt?: string;
  };
  warehouses?: Warehouse[];
}

interface VendorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorDetail | null;
  onApprove: (id: string) => void;
  onRejectClick: (vendor: VendorDetail) => void;
  onSuspend: (id: string) => void;
  isActionPending: boolean;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  open,
  onOpenChange,
  vendor,
  onApprove,
  onRejectClick,
  onSuspend,
  isActionPending,
}) => {
  if (!vendor) return null;

  const documents = [
    { label: 'Owner Photo', url: vendor.ownerPhotoUrl },
    { label: 'PAN Card Certificate', url: vendor.panDocumentUrl },
    { label: 'Citizenship Certificate', url: vendor.citizenshipDocumentUrl },
    { label: 'VAT Registration', url: vendor.vatDocumentUrl },
    { label: 'Business Registration', url: vendor.businessRegDocumentUrl },
  ].filter((doc) => doc.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {vendor.storeLogo ? (
                <img
                  src={vendor.storeLogo}
                  alt={vendor.shopName}
                  className="w-12 h-12 rounded-full object-cover border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border">
                  {vendor.shopName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <DialogTitle className="text-xl font-bold">{vendor.shopName}</DialogTitle>
                <DialogDescription className="text-sm">
                  Registered by {vendor.user?.name || 'Unknown'} ({vendor.user?.email || 'N/A'})
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  vendor.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : vendor.status === 'UNDER_REVIEW' || vendor.status === 'SUBMITTED'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : vendor.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {vendor.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vendor.user?.isEmailVerified
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {vendor.user?.isEmailVerified ? 'Email Verified' : 'Email Unverified'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="legal">Legal & Tax</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="warehouses">Warehouses ({vendor.warehouses?.length || 0})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Shop Name</span>
                  <span className="font-semibold text-sm">{vendor.shopName}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Store Phone Number</span>
                  <span className="font-semibold text-sm">{vendor.phoneNumber}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Owner Full Name</span>
                  <span className="font-semibold text-sm">{vendor.user?.name || 'N/A'}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Owner Email</span>
                  <span className="font-semibold text-sm">{vendor.user?.email || 'N/A'}</span>
                </div>
              </div>

              {vendor.shopDescription && (
                <div className="p-4 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block mb-1">Shop Description</span>
                  <p className="text-sm">{vendor.shopDescription}</p>
                </div>
              )}

              {vendor.rejectionReason && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-900 rounded-r-lg">
                  <span className="font-semibold text-xs uppercase block text-red-700">Previous Rejection Reason</span>
                  <p className="text-sm mt-1">{vendor.rejectionReason}</p>
                </div>
              )}
            </TabsContent>

            {/* Legal Tab */}
            <TabsContent value="legal" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">PAN Number</span>
                  <span className="font-mono font-semibold text-sm">{vendor.panNumber}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Citizenship Number</span>
                  <span className="font-mono font-semibold text-sm">{vendor.citizenshipNumber}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Registered Business Name</span>
                  <span className="font-semibold text-sm">{vendor.businessName || 'N/A'}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Business Reg Number</span>
                  <span className="font-mono font-semibold text-sm">{vendor.businessRegNumber || 'N/A'}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border col-span-2">
                  <span className="text-xs text-muted-foreground block">Business Contact Phone</span>
                  <span className="font-semibold text-sm">{vendor.businessPhoneNumber || vendor.phoneNumber}</span>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No verification documents uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2 bg-card">
                      <span className="font-semibold text-xs block">{doc.label}</span>
                      <div className="h-48 rounded bg-muted/30 overflow-hidden flex items-center justify-center border relative group">
                        <img
                          src={doc.url}
                          alt={doc.label}
                          className="max-h-full max-w-full object-contain"
                        />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-medium text-xs gap-1"
                        >
                          View Full Size ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Warehouses Tab */}
            <TabsContent value="warehouses" className="space-y-4">
              {!vendor.warehouses || vendor.warehouses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No warehouse locations registered.</p>
              ) : (
                <div className="space-y-3">
                  {vendor.warehouses.map((wh) => (
                    <div key={wh.id} className="p-4 border rounded-lg bg-card space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{wh.label || 'Default Warehouse'}</span>
                        <span className="text-xs text-muted-foreground">{wh.city}, {wh.province}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{wh.addressLine1} {wh.addressLine2}</p>
                        <p>Contact: {wh.contactName || 'N/A'} ({wh.contactPhone || 'N/A'})</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
          {vendor.status !== 'APPROVED' && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onApprove(vendor.id)}
              disabled={isActionPending}
            >
              Approve Vendor
            </Button>
          )}

          {vendor.status !== 'REJECTED' && vendor.status !== 'APPROVED' && (
            <Button
              variant="destructive"
              onClick={() => onRejectClick(vendor)}
              disabled={isActionPending}
            >
              Reject Vendor
            </Button>
          )}

          {vendor.status === 'APPROVED' && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onSuspend(vendor.id)}
              disabled={isActionPending}
            >
              Suspend Account
            </Button>
          )}

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
