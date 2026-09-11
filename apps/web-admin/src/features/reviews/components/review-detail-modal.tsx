import React from 'react';
import { Check, Star, ThumbsUp, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';

import type { AdminReviewItem, ReviewStatus } from '../types';
import {
  formatCustomerName,
  formatFitRatingLabel,
  formatReviewDate,
} from '../utils/review-formatters';

import { ReviewStatusBadge } from './review-status-badge';

interface ReviewDetailModalProps {
  review: AdminReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (reviewId: string, status: ReviewStatus) => void;
  isUpdating?: boolean;
}

export function ReviewDetailModal({
  review,
  isOpen,
  onClose,
  onStatusUpdate,
  isUpdating,
}: ReviewDetailModalProps) {
  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Customer Review Details</DialogTitle>
            <ReviewStatusBadge status={review.status} />
          </div>
          <DialogDescription>
            Submitted by {formatCustomerName(review.user)} on {formatReviewDate(review.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Product Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            {review.product.thumbnail ? (
              <img
                src={review.product.thumbnail}
                alt={review.product.title}
                className="h-12 w-12 rounded object-cover border"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs">
                No Image
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{review.product.title}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {review.rating} / 5
                </span>
                <span>•</span>
                <span>Fit: {formatFitRatingLabel(review.fitRating)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {review.helpfulCount} helpful
                </span>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Customer Feedback
            </label>
            <p className="p-3 rounded-lg bg-background border text-foreground leading-relaxed">
              {review.comment || '(No comment text provided)'}
            </p>
          </div>

          {/* Customer Photos */}
          {review.images && review.images.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attached Photos ({review.images.length})
              </label>
              <div className="grid grid-cols-4 gap-2">
                {review.images.map((imgUrl, idx) => (
                  <a
                    key={idx}
                    href={imgUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-md overflow-hidden border hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={imgUrl}
                      alt={`Review photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {review.status !== 'REJECTED' && (
              <Button
                variant="destructive"
                onClick={() => onStatusUpdate(review.id, 'REJECTED')}
                disabled={isUpdating}
                className="gap-1"
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            )}
            {review.status !== 'APPROVED' && (
              <Button
                variant="default"
                onClick={() => onStatusUpdate(review.id, 'APPROVED')}
                disabled={isUpdating}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
