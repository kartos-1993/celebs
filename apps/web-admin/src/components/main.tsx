import { useSidebarContext } from '@/context/sidebar-provider';
import { cn } from '@/lib/utils';
import React from 'react';

type MainProps = {
  children: React.ReactNode;
};

const Main = ({ children }: MainProps) => {
  const { isSidebarOpen } = useSidebarContext();
  return (
    <main
      className={cn(
        'px-6 pb-8 min-h-[calc(100vh-48px)] bg-zinc-50 dark:bg-zinc-950 transition-[margin-left] ease-in-out duration-300',
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-[81px]',
      )}
    >
      {children}
    </main>
  );
};

export default Main;
