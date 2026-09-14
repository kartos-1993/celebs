import React, { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';

import { ReviewDetailModal } from '../components/review-detail-modal';
import { ReviewFilterToolbar } from '../components/review-filter-toolbar';
import { ReviewModerationTable } from '../components/review-moderation-table';
import { useAdminReviews, useUpdateReviewStatusMutation } from '../hooks/use-admin-reviews';
import type { AdminReviewItem, ReviewStatus } from '../types';

export default function ReviewModerationPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReviewStatus | 'ALL'>('ALL');
  const [rating, setRating] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<AdminReviewItem | null>(null);

  const { data, isLoading } = useAdminReviews({
    page,
    limit: 10,
    status,
    rating,
    search,
  });

  const updateMutation = useUpdateReviewStatusMutation();

  const handleStatusUpdate = (reviewId: string, nextStatus: ReviewStatus) => {
    updateMutation.mutate(
      { reviewId, status: nextStatus },
      {
        onSuccess: () => {
          setSelectedReview(null);
        },
      },
    );
  };

  const reviews = data?.data?.reviews ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review customer feedback, inspect attached photos, and moderate ratings.
        </p>
      </div>

      <ReviewFilterToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        rating={rating}
        onRatingChange={(val) => {
          setRating(val);
          setPage(1);
        }}
      />

      <ReviewModerationTable
        reviews={reviews}
        isLoading={isLoading}
        onSelectReview={(rev) => setSelectedReview(rev)}
        onQuickStatusUpdate={handleStatusUpdate}
        isUpdating={updateMutation.isPending}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} reviews
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ReviewDetailModal
        review={selectedReview}
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={updateMutation.isPending}
      />
    </div>
  );
}
