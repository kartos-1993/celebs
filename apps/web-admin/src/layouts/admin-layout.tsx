import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router-dom';

import Main from '@/components/main';
import { Navbar } from '@/components/nav-bar';
import { DashboardSkeleton, FormSkeleton, PageSkeleton } from '@/components/page-skeleton';
import Sidebar from '@/components/sidebar';
import { TableSkeleton } from '@/components/table-skeleton';
import SidebarProvider from '@/context/sidebar-provider';
import { skeletonForPath } from '@/routes/skeleton-for-path';

/** Chunk-load fallback matching the destination silhouette (same owner). */
function RouteSkeleton() {
  const { pathname } = useLocation();
  const kind = skeletonForPath(pathname);
  if (kind === 'table') return <TableSkeleton rows={10} columns={6} />;
  if (kind === 'dashboard') return <DashboardSkeleton />;
  if (kind === 'form') return <FormSkeleton />;
  return <PageSkeleton />;
}

export const AdminLayout = () => {
  const matches = useMatches();

  useEffect(() => {
    const currentMatch = matches[matches.length - 1];
    const handle = currentMatch?.handle as { title?: string; crumb?: string } | undefined;
    const title = handle?.title || handle?.crumb;
    document.title = title ? `${title} | Celebs Admin` : 'Celebs Admin';
  }, [matches]);

  return (
    <div>
      <SidebarProvider>
        <div>
          <Sidebar />
        </div>
        <div className="bg-muted/40 min-h-screen">
          <Navbar />
          <Main>
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </Main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
