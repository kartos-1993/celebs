import { Button } from '@celebs/shared-ui/components/button';

import type { Mode } from '../types';

interface OrderPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  visibleCount: number;
  mode: Mode;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function OrderPagination({
  page,
  totalPages,
  total,
  visibleCount,
  mode,
  isLoading,
  onPrev,
  onNext,
}: OrderPaginationProps) {
  return (
    <nav
      aria-label="Orders pagination"
      className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Showing {visibleCount} of {total} {mode === 'vendor' ? 'items' : 'orders'}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={onPrev}>
          Previous
        </Button>
        <span aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages || isLoading}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
