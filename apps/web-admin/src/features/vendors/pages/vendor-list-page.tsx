import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminVendors,
  getAdminVendorById,
  approveVendor,
  rejectVendor,
  suspendVendor,
} from '../api';
import { VENDORS_QUERY_KEYS } from '../api';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { VendorDetailModal } from '../components/vendor-detail-modal';
import { VendorRejectionDialog } from '../components/vendor-rejection-dialog';
import { VendorStatusBadge } from '../components/vendor-status-badge';

interface VendorListItem {
  id: string;
  shopName: string;
  phoneNumber: string;
  status: string;
  createdAt?: string;
  user?: {
    name?: string;
    email?: string;
    isEmailVerified?: boolean;
  };
}

export default function VendorList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Rejection Dialog State
  const [rejectingVendor, setRejectingVendor] = useState<{ id: string; shopName: string } | null>(
    null,
  );
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: VENDORS_QUERY_KEYS.list(),
    queryFn: getAdminVendors,
  });

  const { data: detailResponse } = useQuery({
    queryKey: VENDORS_QUERY_KEYS.detail(selectedVendorId || ''),
    queryFn: () => getAdminVendorById(selectedVendorId!),
    enabled: !!selectedVendorId && isDetailOpen,
  });

  const approveMutation = useMutation({
    mutationFn: approveVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_QUERY_KEYS.all });
      setIsDetailOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_QUERY_KEYS.all });
      setIsRejectDialogOpen(false);
      setIsDetailOpen(false);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: suspendVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_QUERY_KEYS.all });
      setIsDetailOpen(false);
    },
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading vendors list...</div>;
  }

  const vendors: VendorListItem[] = response?.data || [];

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.user?.name && v.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.user?.email && v.user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'UNDER_REVIEW'
          ? v.status === 'UNDER_REVIEW' || v.status === 'SUBMITTED' || v.status === 'PENDING'
          : v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleInspect = (id: string) => {
    setSelectedVendorId(id);
    setIsDetailOpen(true);
  };

  const handleInitiateReject = (vendor: { id: string; shopName: string }) => {
    setRejectingVendor(vendor);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    if (!rejectingVendor) return;
    rejectMutation.mutate({ id: rejectingVendor.id, reason });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Management</h1>
          <p className="text-sm text-muted-foreground">
            Review vendor onboarding submissions, legal documents, and approve seller accounts.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by shop, owner, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {['ALL', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'default' : 'ghost'}
              onClick={() => setStatusFilter(status)}
              className="text-xs"
            >
              {status === 'ALL' ? 'All Vendors' : status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="p-4">Shop & Owner</th>
              <th className="p-4">Contact Phone</th>
              <th className="p-4">Email Status</th>
              <th className="p-4">Vendor Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y">
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No vendors found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-foreground">{vendor.shopName}</div>
                    <div className="text-xs text-muted-foreground">
                      {vendor.user?.name} ({vendor.user?.email})
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs">{vendor.phoneNumber}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        vendor.user?.isEmailVerified
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {vendor.user?.isEmailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="p-4">
                    <VendorStatusBadge status={vendor.status} />
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleInspect(vendor.id)}>
                      Inspect Documents
                    </Button>

                    {vendor.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        
                        onClick={() => approveMutation.mutate(vendor.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    )}

                    {vendor.status !== 'REJECTED' && vendor.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleInitiateReject(vendor)}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vendor Detail & Document Inspection Modal */}
      <VendorDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        vendor={detailResponse?.data || null}
        onApprove={(id) => approveMutation.mutate(id)}
        onRejectClick={(v) => handleInitiateReject(v)}
        onSuspend={(id) => suspendMutation.mutate(id)}
        isActionPending={
          approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending
        }
      />

      {/* Structured Rejection Dialog */}
      <VendorRejectionDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        shopName={rejectingVendor?.shopName || ''}
        onConfirm={handleConfirmReject}
        isSubmitting={rejectMutation.isPending}
      />
    </div>
  );
}
