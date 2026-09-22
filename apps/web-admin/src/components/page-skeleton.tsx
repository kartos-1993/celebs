import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
}

/**
 * Calm generic page placeholder: title + one quiet card. Same low-contrast
 * tone as the boot skeleton — no block storm.
 */
export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div role="status" aria-label="Loading page" className={cn('space-y-6', className)}>
      <div className="animate-pulse space-y-1.5 motion-reduce:animate-none">
        <div className="h-7 w-44 rounded bg-muted/50" />
        <div className="h-3 w-64 rounded bg-muted/30" />
      </div>
      <div className="animate-pulse space-y-2.5 rounded-xl border bg-card p-3 shadow-sm motion-reduce:animate-none sm:p-4">
        <div className="h-3 rounded bg-muted/30" style={{ width: '92%' }} />
        <div className="h-3 rounded bg-muted/30" style={{ width: '78%' }} />
        <div className="h-9 rounded-lg bg-muted/40" style={{ width: '100%' }} />
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
