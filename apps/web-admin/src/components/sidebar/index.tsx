import { Link } from 'react-router-dom';
import { PanelsTopLeft } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { Menu } from '../menu';

import SidebarToggle from '@/components/sidebar/sidebar-toggle';
import { useSidebarContext } from '@/context/sidebar-provider';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { isSidebarOpen, setIsSidebarOpen, setIsHover } = useSidebarContext();
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full border-r border-border/70 bg-card transition-[width,transform] ease-in-out duration-200 md:translate-x-0',
        isSidebarOpen ? 'w-64' : 'w-[76px]',
      )}
    >
      <SidebarToggle isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative flex h-full flex-col overflow-hidden px-3 py-4"
      >
        <Button
          className={cn(
            'mb-2 h-auto justify-start px-1 py-1 transition-transform ease-in-out duration-300',
            !isSidebarOpen ? 'translate-x-1' : 'translate-x-0',
          )}
          variant="link"
          asChild
        >
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PanelsTopLeft className="h-4 w-4" />
            </span>
            <h1
              className={cn(
                'whitespace-nowrap text-sm font-semibold tracking-tight text-foreground transition-[transform,opacity,display] ease-in-out duration-300',
                !isSidebarOpen ? 'hidden -translate-x-96 opacity-0' : 'translate-x-0 opacity-100',
              )}
            >
              Seller Center
            </h1>
          </Link>
        </Button>

        <Menu isSidebarOpen={isSidebarOpen} />
      </div>
    </aside>
  );
};

export default Sidebar;
