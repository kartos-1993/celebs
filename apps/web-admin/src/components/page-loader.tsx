import { Spinner } from '@celebs/shared-ui/components/spinner';

export function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
      <Spinner size="xl" className="text-primary" />
    </div>
  );
}

export function FullscreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Sidebar Wireframe Skeleton */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-card/30 p-4 space-y-4">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-2 pt-4">
          <div className="h-9 w-full rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-9 w-full rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-9 w-full rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-9 w-full rounded-lg bg-muted/40 animate-pulse" />
        </div>
      </aside>

      {/* Main Content Skeleton Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Navbar Skeleton */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 px-6">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        </header>

        {/* Center Spinner Area */}
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-primary" />
          </div>
        </main>
      </div>
    </div>
  );
}

export default PageLoader;
