import { Suspense,useEffect } from 'react';
import { Outlet, useMatches, useNavigation } from 'react-router-dom';

import Main from '@/components/main';
import { Navbar } from '@/components/nav-bar';
import PageLoader from '@/components/page-loader';
import Sidebar from '@/components/sidebar';
import SidebarProvider from '@/context/sidebar-provider';

export const AdminLayout = () => {
  const matches = useMatches();
  const navigation = useNavigation();
  const isNavigating = navigation.state === 'loading';

  useEffect(() => {
    const currentMatch = matches[matches.length - 1];
    const handle = currentMatch?.handle as { title?: string; crumb?: string } | undefined;
    const title = handle?.title || handle?.crumb;
    document.title = title ? `${title} | Celebs Admin` : 'Celebs Admin';
  }, [matches]);

  return (
    <div>
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full origin-left transition-all duration-300" />
        </div>
      )}
      <SidebarProvider>
        <div>
          <Sidebar />
        </div>
        <div className="bg-muted/40 min-h-screen">
          <Navbar />
          <Main>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </Main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
