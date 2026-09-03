import { Store } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

import type { VendorListItem } from '../types';

import { VendorStatusBadge } from './vendor-status-badge';

interface VendorCardsProps {
  vendors: VendorListItem[];
  onInspect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (vendor: { id: string; shopName: string }) => void;
  isActionPending: boolean;
}

/** Mobile vendors list — cards below md, paired with VendorTable. */
export function VendorCards({
  vendors,
  onInspect,
  onApprove,
  onReject,
  isActionPending,
}: VendorCardsProps) {
  if (vendors.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState title="No vendors found matching your filter criteria." />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {vendors.map((vendor) => (
        <Card key={vendor.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Store aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {vendor.shopName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {vendor.user?.name} ({vendor.user?.email})
                </div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {vendor.phoneNumber}
                </div>
              </div>
            </div>
            <VendorStatusBadge status={vendor.status} />
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant={vendor.user?.isEmailVerified ? 'success' : 'warning'}>
              {vendor.user?.isEmailVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1"
              onClick={() => onInspect(vendor.id)}
            >
              Inspect
            </Button>
            {vendor.status !== 'APPROVED' && (
              <Button
                className="h-10 flex-1"
                onClick={() => onApprove(vendor.id)}
                disabled={isActionPending}
              >
                Approve
              </Button>
            )}
            {vendor.status !== 'REJECTED' && vendor.status !== 'APPROVED' && (
              <Button
                variant="destructive"
                className="h-10 flex-1"
                onClick={() => onReject(vendor)}
                disabled={isActionPending}
              >
                Reject
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
