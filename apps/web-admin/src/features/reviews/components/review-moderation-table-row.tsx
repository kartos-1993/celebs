import { Check, Eye, Image as ImageIcon, Star, X } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { TableCell, TableRow } from '@celebs/shared-ui/components/table';

import type { AdminReviewItem, ReviewStatus } from '../types';
import { formatCustomerName, formatReviewDate } from '../utils/review-formatters';

import { ReviewStatusBadge } from './review-status-badge';

interface ReviewModerationTableRowProps {
  review: AdminReviewItem;
  onSelectReview: (review: AdminReviewItem) => void;
  onQuickStatusUpdate: (reviewId: string, status: ReviewStatus) => void;
  isUpdating?: boolean;
}

export function ReviewModerationTableRow({
  review,
  onSelectReview,
  onQuickStatusUpdate,
  isUpdating,
}: ReviewModerationTableRowProps) {
  return (
    <TableRow key={review.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {review.product.thumbnail ? (
            <img
              src={review.product.thumbnail}
              alt={review.product.title}
              className="h-8 w-8 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px]">
              No Img
            </div>
          )}
          <span className="line-clamp-2 max-w-52 text-sm font-semibold tracking-tight leading-tight text-foreground">
            {review.product.title}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-0.5 text-xs">
          <p className="max-w-36 truncate font-semibold text-foreground">
            {formatCustomerName(review.user)}
          </p>
          <p className="whitespace-nowrap text-muted-foreground">
            {formatReviewDate(review.createdAt)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-amber-600">
          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
          {review.rating} / 5
        </div>
      </TableCell>
      <TableCell>
        <p className="line-clamp-2 max-w-sm text-xs text-muted-foreground">
          {review.comment || <span className="italic">(No text)</span>}
        </p>
      </TableCell>
      <TableCell className="text-center">
        {review.images && review.images.length > 0 ? (
          <Badge variant="secondary" className="gap-1">
            <ImageIcon className="h-3 w-3" /> {review.images.length}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <ReviewStatusBadge status={review.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
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
              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
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
              className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
  );
}
