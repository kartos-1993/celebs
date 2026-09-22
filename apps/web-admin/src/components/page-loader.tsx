import { useState } from 'react';

import { DashboardSkeleton, FormSkeleton, PageSkeleton } from '@/components/page-skeleton';
import { TableSkeleton } from '@/components/table-skeleton';
import type { SkeletonKind } from '@/routes/landing-resolver';

export function PageLoader() {
  return <PageSkeleton />;
}

export function FullscreenLoader({ variant = 'page' }: { variant?: SkeletonKind }) {
  // Mirror AdminLayout geometry exactly (fixed rail + ml offset + h-12
  // navbar + muted content) so boot swaps without a layout shift.
  // Same >=1024 default-open rule as SidebarProvider.
  const [wide] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Sidebar rail skeleton */}
      <aside
        className={`hidden md:flex flex-col border-r border-border/50 bg-card/30 p-4 space-y-4 fixed top-0 left-0 z-40 h-screen ${
          wide ? 'w-64' : 'w-[76px]'
        }`}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-7 w-7 rounded-lg bg-muted animate-pulse motion-reduce:animate-none" />
          {wide && (
            <div className="h-4 w-28 rounded bg-muted animate-pulse motion-reduce:animate-none" />
          )}
        </div>
        <div className="space-y-2 pt-4">
          <div className="h-9 w-full rounded-lg bg-muted/60 animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-full rounded-lg bg-muted/40 animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-full rounded-lg bg-muted/40 animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-full rounded-lg bg-muted/40 animate-pulse motion-reduce:animate-none" />
        </div>
      </aside>

      {/* Main content skeleton area */}
      <div className={`flex flex-col min-h-screen ${wide ? 'md:ml-64' : 'md:ml-[76px]'}`}>
        {/* Navbar skeleton (h-12 like the real Navbar) */}
        <header className="flex h-12 items-center justify-between border-b border-border/50 px-4 md:px-6">
          <div className="h-4 w-32 rounded bg-muted animate-pulse motion-reduce:animate-none" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse motion-reduce:animate-none" />
          </div>
        </header>

        <main className="min-h-[calc(100vh-48px)] bg-muted/40 px-4 py-6 md:px-6">
          {variant === 'table' ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="h-8 w-48 animate-pulse motion-reduce:animate-none rounded bg-muted" />
                <div className="h-4 w-72 animate-pulse motion-reduce:animate-none rounded bg-muted/60" />
              </div>
              <TableSkeleton rows={8} columns={5} />
            </div>
          ) : variant === 'dashboard' ? (
            <DashboardSkeleton />
          ) : variant === 'form' ? (
            <FormSkeleton />
          ) : (
            <PageSkeleton />
          )}
        </main>
      </div>
    </div>
  );
}

export default PageLoader;
