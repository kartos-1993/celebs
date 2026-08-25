import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, X } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';

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

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';
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
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleInspect(vendor.id)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Inspect documents</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Inspect documents</TooltipContent>
                        </Tooltip>

                        {vendor.status !== 'APPROVED' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-success hover:bg-success/10 hover:text-success"
                                onClick={() => approveMutation.mutate(vendor.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                                <span className="sr-only">Approve vendor</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve vendor</TooltipContent>
                          </Tooltip>
                        )}

                        {vendor.status !== 'REJECTED' && vendor.status !== 'APPROVED' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleInitiateReject(vendor)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Reject vendor</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject vendor</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
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
