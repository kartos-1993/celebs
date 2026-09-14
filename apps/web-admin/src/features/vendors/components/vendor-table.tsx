import { Badge } from '@celebs/shared-ui/components/badge';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { VendorListItem } from '../types';

import { VendorRowActions } from './vendor-row-actions';
import { VendorStatusBadge } from './vendor-status-badge';

interface VendorTableProps {
  vendors: VendorListItem[];
  onInspect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (vendor: { id: string; shopName: string }) => void;
  isActionPending: boolean;
}

/** Desktop vendors table — hidden below md, paired with VendorCards. */
export function VendorTable({
  vendors,
  onInspect,
  onApprove,
  onReject,
  isActionPending,
}: VendorTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
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
          {vendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState title="No vendors found matching your filter criteria." />
              </TableCell>
            </TableRow>
          ) : (
            vendors.map((vendor) => (
              <TableRow key={vendor.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="text-sm font-semibold text-foreground">{vendor.shopName}</div>
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
                  <VendorRowActions
                    shopName={vendor.shopName}
                    status={vendor.status}
                    onInspect={() => onInspect(vendor.id)}
                    onApprove={() => onApprove(vendor.id)}
                    onReject={() => onReject(vendor)}
                    isActionPending={isActionPending}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
