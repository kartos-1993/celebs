import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Calm table placeholder matching the boot skeleton's subtlety: low-contrast
 * static-toned bars with a single soft pulse rhythm (no per-cell shimmer).
 */
export function TableSkeleton({ rows = 6, columns = 5, className }: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading table data"
      className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}
    >
      <div className="flex h-9 animate-pulse items-center gap-4 border-b bg-muted/50 px-3 motion-reduce:animate-none">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-2.5 rounded bg-muted/50" style={{ width: 48 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex animate-pulse items-center gap-4 border-b px-3 py-3 motion-reduce:animate-none last:border-0"
          style={{ animationDelay: `${rowIndex * 90}ms` }}
        >
          <div className="h-8 w-8 shrink-0 rounded-md bg-muted/40" />
          <div className="h-2.5 rounded bg-muted/40" style={{ width: '28%' }} />
          <div className="h-2.5 rounded bg-muted/30" style={{ width: '18%' }} />
          <div className="ml-auto h-2.5 rounded bg-muted/30" style={{ width: '12%' }} />
        </div>
      ))}
      <span className="sr-only">Loading table data…</span>
    </div>
  );
}
