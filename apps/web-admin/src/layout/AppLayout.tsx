import { Suspense } from 'react';
import SideBar from '@/components/sidebar';
import SideBarProvider from '@/context/sidebar-provider';
import { Outlet } from 'react-router-dom';

import Main from '@/components/main';
import { Navbar } from '@/components/nav-bar';
import PageLoader from '@/components/page-loader';

const AppLayout = () => {
  return (
    <div>
      <SideBarProvider>
        <div>
          <SideBar />
        </div>
        <div>
          <Navbar />
          <Main>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </Main>
        </div>
      </SideBarProvider>
    </div>
  );
};

export default AppLayout;
