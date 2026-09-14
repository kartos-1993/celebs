import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { formatProductCategoryBreadcrumb } from '../../utils/category-format';
import { formatShortDate, getInitials, getVendorDisplay } from '../../utils/product-table-helpers';

import { QualityBadge } from './quality-badge';
import type { ProductQueueItem } from './types';

import { RowActionsMenu } from '@/components/row-actions-menu';

interface QueueTableProps {
  products: ProductQueueItem[];
  activeTab: string;
  isFetching: boolean;
  isReviewPending: boolean;
  onPreview: (product: ProductQueueItem) => void;
  onApprove: (id: string) => void;
  onReject: (product: ProductQueueItem) => void;
}

/** Desktop review-queue table — hidden below md, paired with QueueCards. */
export function QueueTable({
  products,
  activeTab,
  isFetching,
  isReviewPending,
  onPreview,
  onApprove,
  onReject,
}: QueueTableProps) {
  return (
    <div
      className={`hidden overflow-x-auto rounded-xl border bg-card shadow-sm transition-opacity md:block ${isFetching ? 'opacity-60' : ''}`}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>QC Score</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Submitted</TableHead>
            {activeTab === 'rejected' && <TableHead>Rejection Reason</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={product.mainImages?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="h-10 w-10 shrink-0 rounded-lg border bg-muted object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = '/placeholder.svg';
                    }}
                  />
                  <div className="min-w-0">
                    <span className="block max-w-xs truncate text-sm font-medium leading-tight">
                      {product.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {product.brand || 'N/A'}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <QualityBadge score={product.qualityScore} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {getInitials(getVendorDisplay(product))}
                  </span>
                  <span className="max-w-32 truncate text-sm">
                    {product.vendorName || 'Independent Seller'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className="block max-w-[220px] truncate text-xs"
                  title={formatProductCategoryBreadcrumb(product)}
                >
                  {formatProductCategoryBreadcrumb(product)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                <div>Rs. {product.price.toLocaleString()}</div>
                {product.discountedPrice && (
                  <div className="font-mono text-xs font-normal tabular-nums text-success">
                    Disc: Rs. {product.discountedPrice.toLocaleString()}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatShortDate(product.createdAt)}
              </TableCell>
              {activeTab === 'rejected' && (
                <TableCell className="max-w-xs truncate">
                  <div className="text-xs font-medium text-destructive">
                    {product.rejectionReasonCategory || 'General QC Issue'}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {product.reviewNote || 'No detailed note provided'}
                  </div>
                </TableCell>
              )}
              <TableCell className="text-right">
                <RowActionsMenu
                  label={`Actions for ${product.name}`}
                  items={[
                    { label: 'Preview listing', onSelect: () => onPreview(product) },
                    ...(activeTab === 'pending'
                      ? [
                          {
                            label: 'Approve & publish',
                            onSelect: () => onApprove(product.id),
                            disabled: isReviewPending,
                          },
                          {
                            label: 'Reject listing',
                            onSelect: () => onReject(product),
                            disabled: isReviewPending,
                            destructive: true,
                          },
                        ]
                      : []),
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
