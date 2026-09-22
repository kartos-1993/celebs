import { Suspense, useEffect } from 'react';
import { Outlet, useMatches } from 'react-router-dom';

import Main from '@/components/main';
import { Navbar } from '@/components/nav-bar';
import { PageSkeleton } from '@/components/page-skeleton';
import Sidebar from '@/components/sidebar';
import SidebarProvider from '@/context/sidebar-provider';

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
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </Main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
