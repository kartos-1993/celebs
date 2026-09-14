import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';

import { formatProductCategoryBreadcrumb } from '../../utils/category-format';
import { formatShortDate } from '../../utils/product-table-helpers';

import { QualityBadge } from './quality-badge';
import type { ProductQueueItem } from './types';

interface QueueCardsProps {
  products: ProductQueueItem[];
  activeTab: string;
  isFetching: boolean;
  isReviewPending: boolean;
  onPreview: (product: ProductQueueItem) => void;
  onApprove: (id: string) => void;
  onReject: (product: ProductQueueItem) => void;
}

/** Mobile review-queue list — cards below md, paired with QueueTable. */
export function QueueCards({
  products,
  activeTab,
  isFetching,
  isReviewPending,
  onPreview,
  onApprove,
  onReject,
}: QueueCardsProps) {
  return (
    <div className={`space-y-3 transition-opacity md:hidden ${isFetching ? 'opacity-60' : ''}`}>
      {products.map((product) => (
        <Card key={product.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <img
              src={product.mainImages?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="h-14 w-14 shrink-0 rounded-lg border bg-muted object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = '/placeholder.svg';
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">{product.name}</div>
              <div className="truncate text-xs text-muted-foreground">{product.brand || 'N/A'}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <QualityBadge score={product.qualityScore} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="truncate text-sm">{product.vendorName || 'Independent Seller'}</span>
            <Badge
              variant="secondary"
              className="max-w-full truncate text-xs"
              title={formatProductCategoryBreadcrumb(product)}
            >
              {formatProductCategoryBreadcrumb(product)}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-sm tabular-nums">
              Rs. {product.price.toLocaleString()}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatShortDate(product.createdAt)}
            </span>
          </div>
          {product.discountedPrice && (
            <div className="-mt-2 font-mono text-xs font-normal tabular-nums text-success">
              Disc: Rs. {product.discountedPrice.toLocaleString()}
            </div>
          )}

          {activeTab === 'rejected' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
              <div className="text-xs font-medium text-destructive">
                {product.rejectionReasonCategory || 'General QC Issue'}
              </div>
              <div className="text-xs text-muted-foreground">
                {product.reviewNote || 'No detailed note provided'}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="h-10 flex-1" onClick={() => onPreview(product)}>
              Preview
            </Button>
            {activeTab === 'pending' && (
              <>
                <Button
                  className="h-10 flex-1"
                  onClick={() => onApprove(product.id)}
                  disabled={isReviewPending}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="h-10 flex-1"
                  onClick={() => onReject(product)}
                  disabled={isReviewPending}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
