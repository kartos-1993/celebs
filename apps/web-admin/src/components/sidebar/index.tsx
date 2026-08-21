import { Link } from 'react-router-dom';
import { PanelsTopLeft } from 'lucide-react';

import SidebarToggle from '@/components/sidebar/sidebar-toggle';
import { cn } from '@/lib/utils';
import { useSidebarContext } from '@/context/sidebar-provider';
import { Menu } from '../menu';
import { Button } from '@celebs/shared-ui/components/button';

const Sidebar = () => {
  const { isSidebarOpen, setIsSidebarOpen, setIsHover } = useSidebarContext();
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-200',
        isSidebarOpen ? 'w-64' : 'w-[80px]',
      )}
    >
      <SidebarToggle isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative h-full flex flex-col px-3 py-4 overflow-y-auto overflow-x-hidden shadow-md dark:shadow-zinc-800"
      >
        <Button
          className={cn(
            'transition-transform ease-in-out duration-300 mb-1',
            !isSidebarOpen ? 'translate-x-1' : 'translate-x-0',
          )}
          variant="link"
          asChild
        >
          <Link to="/" className="flex items-center gap-2">
            <PanelsTopLeft className="w-6 h-6 mr-1" />
            <h1
              className={cn(
                'font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300',
                !isSidebarOpen ? '-translate-x-96 opacity-0 hidden' : 'translate-x-0 opacity-100',
              )}
            >
              Celebs Seller Center
            </h1>
          </Link>
        </Button>

        <Menu isSidebarOpen={isSidebarOpen} />
      </div>
    </aside>
  );
};

export default Sidebar;
