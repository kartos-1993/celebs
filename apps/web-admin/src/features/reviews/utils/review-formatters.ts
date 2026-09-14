import type { AdminReviewUser, ReviewFitRating, ReviewStatus } from '../types';

export function getReviewStatusBadgeVariant(status: ReviewStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Approved',
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
      };
    case 'PENDING_MODERATION':
      return {
        label: 'Pending Review',
        className:
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        className:
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
      };
    default:
      return {
        label: status,
        className: 'bg-muted text-muted-foreground',
      };
  }
}

export function formatCustomerName(user?: AdminReviewUser | null): string {
  if (!user) return 'Anonymous Buyer';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.email?.split('@')[0] || 'Customer';
}

export function formatFitRatingLabel(fitRating?: ReviewFitRating | null): string {
  switch (fitRating) {
    case 'RUNS_SMALL':
      return 'Runs Small';
    case 'RUNS_LARGE':
      return 'Runs Large';
    case 'TRUE_TO_SIZE':
    default:
      return 'True to Size';
  }
}

export function formatReviewDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
