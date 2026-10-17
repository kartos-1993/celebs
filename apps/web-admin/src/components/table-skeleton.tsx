import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Truthful table placeholder: header rhythm (h-9 eyebrow), body rhythm
 * (py-2.5), two-line text stacks like real cells, right-aligned action pill.
 * One shared pulse, reduced-motion safe. Rows default to the standard
 * pageSize so the swap to data holds its height.
 */
export function TableSkeleton({ rows = 10, columns = 5, className }: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading table data"
      className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}
    >
      <div className="flex h-9 animate-pulse items-center gap-4 border-b bg-muted/50 px-3 motion-reduce:animate-none">
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            className={cn('h-2.5 rounded bg-muted/60', index === columns - 1 && 'ml-auto')}
            style={{ width: index === 0 ? 120 : 56 }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex animate-pulse items-center gap-4 border-b px-3 py-2.5 motion-reduce:animate-none last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) =>
            colIndex === columns - 1 ? (
              <div key={colIndex} className="ml-auto h-7 w-16 shrink-0 rounded-md bg-muted/60" />
            ) : (
              <div key={colIndex} className="min-w-0 space-y-1.5" style={{ width: '22%' }}>
                <div className="h-2.5 rounded bg-muted/60" style={{ width: '85%' }} />
                <div className="h-2.5 rounded bg-muted/40" style={{ width: '60%' }} />
              </div>
            ),
          )}
        </div>
      ))}
      <span className="sr-only">Loading table data…</span>
    </div>
  );
}

interface CardListSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Mobile companion to TableSkeleton: stacked card silhouettes for the
 * md:hidden card lists. Pair with `md:hidden` wherever the table skeleton
 * is `hidden md:block`.
 */
export function CardListSkeleton({ rows = 4, className }: CardListSkeletonProps) {
  return (
    <div role="status" aria-label="Loading items" className={cn('space-y-3 md:hidden', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse space-y-2 rounded-xl border bg-card p-3 shadow-sm motion-reduce:animate-none"
        >
          <div className="h-3.5 rounded bg-muted/60" style={{ width: '55%' }} />
          <div className="h-3 rounded bg-muted/40" style={{ width: '80%' }} />
          <div className="flex gap-2">
            <div className="h-7 flex-1 rounded-md bg-muted/40" />
            <div className="h-7 flex-1 rounded-md bg-muted/40" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading items…</span>
    </div>
  );
}
