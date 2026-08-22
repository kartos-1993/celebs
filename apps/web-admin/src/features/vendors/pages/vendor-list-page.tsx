import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { Input } from '@celebs/shared-ui/components/input';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import {
  approveVendor,
  getAdminVendorById,
  getAdminVendors,
  rejectVendor,
  suspendVendor,
} from '../api';
import { VENDORS_QUERY_KEYS } from '../api';
import { VendorDetailModal } from '../components/vendor-detail-modal';
import { VendorRejectionDialog } from '../components/vendor-rejection-dialog';
import { VendorStatusBadge } from '../components/vendor-status-badge';

import { PageLoader } from '@/components/page-loader';

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
    return <PageLoader />;
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
    <div className="space-y-6">
      <PageHeader
        title="Vendor Management"
        description="Review vendor onboarding submissions, legal documents, and approve seller accounts."
      />

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
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Shop &amp; Owner</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead>Email Status</TableHead>
              <TableHead>Vendor Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="No vendors found matching your filter criteria." />
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-semibold text-foreground">{vendor.shopName}</div>
                    <div className="text-xs text-muted-foreground">
                      {vendor.user?.name} ({vendor.user?.email})
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{vendor.phoneNumber}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.user?.isEmailVerified ? 'success' : 'warning'}>
                      {vendor.user?.isEmailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <VendorStatusBadge status={vendor.status} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
