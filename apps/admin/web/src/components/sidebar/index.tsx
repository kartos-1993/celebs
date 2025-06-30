import { Link } from "react-router-dom";
import { PanelsTopLeft } from "lucide-react";

import SidebarToggle from "@/components/sidebar/sidebar-toggle";
import { cn } from "@/lib/utils";
import { useSideBarContext } from "@/context/sidebar-provider";
import { Menu } from "../menu";
import { Button } from "../ui/button";

const SideBar = () => {
  const { isSideBarOpen, setIsSideBarOpen, setIsHover } = useSideBarContext();
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-200",
        isSideBarOpen ? "w-64" : "w-[80px]"
      )}
    >
      <SidebarToggle isOpen={isSideBarOpen} setIsOpen={setIsSideBarOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-800"
      >
        <Button
          className={cn(
            "transition-transform ease-in-out duration-300 mb-1",
            !isSideBarOpen ? "translate-x-1" : "translate-x-0"
          )}
          variant="link"
          asChild
        >
          <Link to="/" className="flex items-center gap-2">
            <PanelsTopLeft className="w-6 h-6 mr-1" />
            <h1
              className={cn(
                "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                !isSideBarOpen
                  ? "-translate-x-96 opacity-0 hidden"
                  : "translate-x-0 opacity-100"
              )}
            >
              Celebs Seller Center
            </h1>
          </Link>
        </Button>

        <Menu isSideBarOpen={isSideBarOpen} />
      </div>
    </aside>
  );
};

export default SideBar;
