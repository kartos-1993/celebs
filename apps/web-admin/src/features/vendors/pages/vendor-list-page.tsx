import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@celebs/shared-ui/components/page-header';

import {
  approveVendor,
  getAdminVendorById,
  getAdminVendors,
  rejectVendor,
  suspendVendor,
} from '../api';
import { VENDORS_QUERY_KEYS } from '../api';
import { VendorCards } from '../components/vendor-cards';
import { VendorDetailModal } from '../components/vendor-detail-modal';
import { VendorRejectionDialog } from '../components/vendor-rejection-dialog';
import { VendorTable } from '../components/vendor-table';
import type { VendorListItem } from '../types';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';
import { PageLoader } from '@/components/page-loader';

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
      <FilterBar>
        <FilterSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by shop, owner, or email..."
        />
        <SegmentedTabs
          options={[
            { value: 'ALL', label: 'All Vendors' },
            { value: 'UNDER_REVIEW', label: 'Under Review' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'SUSPENDED', label: 'Suspended' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </FilterBar>

      {/* Vendors Table (desktop) + Cards (mobile) */}
      <VendorTable
        vendors={filteredVendors}
        onInspect={handleInspect}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={handleInitiateReject}
        isActionPending={
          approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending
        }
      />
      <VendorCards
        vendors={filteredVendors}
        onInspect={handleInspect}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={handleInitiateReject}
        isActionPending={
          approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending
        }
      />

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
