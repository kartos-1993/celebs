import { Check, Eye, Store, X } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
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

import { formatProductCategoryBreadcrumb } from '../../utils/category-format';

import { QualityBadge } from './quality-badge';
import type { ProductQueueItem } from './types';

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
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <img
                    src={product.mainImages?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="h-12 w-12 rounded border bg-muted object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = '/placeholder.svg';
                    }}
                  />
                  <div>
                    <span className="block max-w-xs truncate font-semibold text-foreground">
                      {product.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Brand: <strong className="text-foreground">{product.brand || 'N/A'}</strong>
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <QualityBadge score={product.qualityScore} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Store aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                  {product.vendorName || 'Independent Seller'}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="block max-w-[220px] truncate text-xs"
                  title={formatProductCategoryBreadcrumb(product)}
                >
                  {formatProductCategoryBreadcrumb(product)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                <div className="text-sm text-foreground">Rs. {product.price.toLocaleString()}</div>
                {product.discountedPrice && (
                  <div className="text-xs font-normal text-success">
                    Disc: Rs. {product.discountedPrice.toLocaleString()}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Recent'}
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
                <TooltipProvider>
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onPreview(product)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Preview listing</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview listing</TooltipContent>
                    </Tooltip>

                    {activeTab === 'pending' && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-success hover:bg-success/10 hover:text-success"
                              onClick={() => onApprove(product.id)}
                              disabled={isReviewPending}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Approve and publish</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Approve &amp; publish</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => onReject(product)}
                              disabled={isReviewPending}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Reject listing</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reject listing</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
