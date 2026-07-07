import SideBar from '@/components/sidebar';
import SideBarProvider from '@/context/sidebar-provider';
import { Outlet } from 'react-router-dom';

import Main from '@/components/main';
import { Navbar } from '@/components/nav-bar';

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
            <Outlet />
          </Main>
        </div>
      </SideBarProvider>
    </div>
  );
};

export default AppLayout;
