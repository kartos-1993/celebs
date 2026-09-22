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

interface DashboardSkeletonProps {
  className?: string;
}

/**
 * Analytics-homepage placeholder: title + stat-card row + chart block.
 * Calm low-contrast tone, reduced-motion safe.
 */
export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div role="status" aria-label="Loading dashboard" className={cn('space-y-6', className)}>
      <div className="animate-pulse space-y-1.5 motion-reduce:animate-none">
        <div className="h-7 w-44 rounded bg-muted/50" />
        <div className="h-3 w-64 rounded bg-muted/30" />
      </div>
      <div className="grid animate-pulse grid-cols-2 gap-3 motion-reduce:animate-none lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
            <div className="h-3 w-16 rounded bg-muted/30" />
            <div className="h-6 w-24 rounded bg-muted/50" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-card shadow-sm motion-reduce:animate-none">
        <div className="h-full w-full rounded-xl bg-muted/30" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

interface FormSkeletonProps {
  className?: string;
}

/**
 * Form/settings/wizard placeholder: title + card with field rows + action.
 */
export function FormSkeleton({ className }: FormSkeletonProps) {
  return (
    <div role="status" aria-label="Loading form" className={cn('space-y-6', className)}>
      <div className="animate-pulse space-y-1.5 motion-reduce:animate-none">
        <div className="h-7 w-44 rounded bg-muted/50" />
        <div className="h-3 w-64 rounded bg-muted/30" />
      </div>
      <div className="max-w-2xl animate-pulse space-y-3 rounded-xl border bg-card p-3 shadow-sm motion-reduce:animate-none sm:p-4">
        <div className="h-3 w-24 rounded bg-muted/30" />
        <div className="h-10 rounded-md bg-muted/40" />
        <div className="h-3 w-24 rounded bg-muted/30" />
        <div className="h-10 rounded-md bg-muted/40" />
        <div className="h-3 w-24 rounded bg-muted/30" />
        <div className="h-24 rounded-md bg-muted/40" />
        <div className="h-9 w-32 rounded-md bg-muted/60" />
      </div>
      <span className="sr-only">Loading form…</span>
    </div>
  );
}
