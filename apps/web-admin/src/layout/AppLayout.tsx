import SideBar from '@/components/sidebar';
import SideBarProvider from '@/context/sidebar-provider';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/context/auth-provider';

import Main from '@/components/main';
import { Navbar } from '@/components/nav-bar';

const AppLayout = () => {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
};

export default AppLayout;
