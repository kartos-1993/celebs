import { Badge } from '@celebs/shared-ui/components/badge';
import { TableCell, TableRow } from '@celebs/shared-ui/components/table';

import { formatProductCategoryBreadcrumb } from '../../utils/category-format';
import { formatShortDate, getInitials, getVendorDisplay } from '../../utils/product-table-helpers';

import { QualityBadge } from './quality-badge';
import type { ProductQueueItem } from './types';

import { RowActionsMenu } from '@/components/row-actions-menu';

interface QueueTableRowProps {
  product: ProductQueueItem;
  activeTab: string;
  isReviewPending: boolean;
  onPreview: (product: ProductQueueItem) => void;
  onApprove: (id: string) => void;
  onReject: (product: ProductQueueItem) => void;
}

export function QueueTableRow({
  product,
  activeTab,
  isReviewPending,
  onPreview,
  onApprove,
  onReject,
}: QueueTableRowProps) {
  return (
    <TableRow key={product.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <img
            src={product.mainImages?.[0] || '/placeholder.svg'}
            alt={product.name}
            className="h-8 w-8 shrink-0 rounded-md border bg-muted object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="min-w-0">
            <span className="block max-w-xs truncate text-sm font-semibold tracking-tight leading-tight text-foreground">
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
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(getVendorDisplay(product))}
          </span>
          <span className="max-w-32 truncate text-sm text-foreground">
            {product.vendorName || 'Independent Seller'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className="block max-w-[220px] truncate"
          title={formatProductCategoryBreadcrumb(product)}
        >
          {formatProductCategoryBreadcrumb(product)}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono text-xs whitespace-nowrap tabular-nums">
        <div>Rs. {product.price.toLocaleString()}</div>
        {product.discountedPrice && (
          <div className="font-mono text-xs font-normal tabular-nums text-success">
            Disc: Rs. {product.discountedPrice.toLocaleString()}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
        {formatShortDate(product.createdAt)}
      </TableCell>
      {activeTab === 'rejected' && (
        <TableCell className="max-w-xs truncate">
          <div className="truncate text-xs font-medium text-destructive">
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
  );
}
