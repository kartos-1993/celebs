import SideBar from "@/components/sidebar";
import SideBarProvider, { useSideBarContext } from "@/context/sidebar-provider";
import { cn } from "@/lib/utils";
import { Outlet, useLoaderData, useRouteLoaderData } from "react-router-dom";
import { ProtectedLoaderData } from "@/types";
import Main from "@/components/main";
import { Navbar } from "@/components/nav-bar";

const AppLayout = () => {
  const data = useLoaderData() as ProtectedLoaderData;

  return (
    <div>
      <SideBarProvider>
        <SideBar />
        <Main>
          <Navbar />
          <Outlet />
        </Main>
      </SideBarProvider>
    </div>
  );
};

export default AppLayout;
