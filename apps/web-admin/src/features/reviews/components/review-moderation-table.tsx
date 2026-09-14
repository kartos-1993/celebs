import React from 'react';
import { Check, Eye, Image as ImageIcon, Star, X } from 'lucide-react';

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

import type { AdminReviewItem, ReviewStatus } from '../types';
import { formatCustomerName, formatReviewDate } from '../utils/review-formatters';

import { ReviewStatusBadge } from './review-status-badge';

interface ReviewModerationTableProps {
  reviews: AdminReviewItem[];
  isLoading: boolean;
  onSelectReview: (review: AdminReviewItem) => void;
  onQuickStatusUpdate: (reviewId: string, status: ReviewStatus) => void;
  isUpdating?: boolean;
}

export function ReviewModerationTable({
  reviews,
  isLoading,
  onSelectReview,
  onQuickStatusUpdate,
  isUpdating,
}: ReviewModerationTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-card text-muted-foreground">
        Loading customer reviews...
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-card text-center p-6">
        <p className="font-medium text-foreground">No customer reviews found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search terms or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">Product</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="w-[110px]">Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead className="w-[90px] text-center">Photos</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-2.5">
                  {review.product.thumbnail ? (
                    <img
                      src={review.product.thumbnail}
                      alt={review.product.title}
                      className="h-9 w-9 rounded object-cover border shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-[10px] shrink-0">
                      No Img
                    </div>
                  )}
                  <span className="font-medium text-xs line-clamp-2">{review.product.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs">
                  <p className="font-medium text-foreground">{formatCustomerName(review.user)}</p>
                  <p className="text-muted-foreground">{formatReviewDate(review.createdAt)}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 font-semibold text-xs text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {review.rating} / 5
                </div>
              </TableCell>
              <TableCell>
                <p className="text-xs text-muted-foreground line-clamp-2 max-w-sm">
                  {review.comment || <span className="italic">(No text)</span>}
                </p>
              </TableCell>
              <TableCell className="text-center">
                {review.images && review.images.length > 0 ? (
                  <Badge variant="secondary" className="gap-1 text-[11px] px-1.5 py-0">
                    <ImageIcon className="h-3 w-3" /> {review.images.length}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell>
                <ReviewStatusBadge status={review.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onSelectReview(review)}
                    title="View Details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {review.status !== 'APPROVED' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => onQuickStatusUpdate(review.id, 'APPROVED')}
                      disabled={isUpdating}
                      title="Quick Approve"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {review.status !== 'REJECTED' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => onQuickStatusUpdate(review.id, 'REJECTED')}
                      disabled={isUpdating}
                      title="Quick Reject"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
