import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { AdminReviewItem, ReviewStatus } from '../types';

import { ReviewModerationTableRow } from './review-moderation-table-row';

import { TableSkeleton } from '@/components/table-skeleton';

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
    return <TableSkeleton rows={10} columns={7} />;
  }

  if (reviews.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-foreground">No customer reviews found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search terms or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
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
            <ReviewModerationTableRow
              key={review.id}
              review={review}
              onSelectReview={onSelectReview}
              onQuickStatusUpdate={onQuickStatusUpdate}
              isUpdating={isUpdating}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
