import React from 'react';

import { useSidebarContext } from '@/context/sidebar-provider';
import { cn } from '@/lib/utils';

type MainProps = {
  children: React.ReactNode;
};

const Main = ({ children }: MainProps) => {
  const { isSidebarOpen } = useSidebarContext();
  return (
    <main
      className={cn(
        'min-h-[calc(100vh-48px)] bg-muted/40 px-4 py-6 transition-[margin-left] ease-in-out duration-300 md:px-6',
        isSidebarOpen ? 'md:ml-[76px] lg:ml-64' : 'md:ml-[76px]',
      )}
    >
      {children}
    </main>
  );
};

export default Main;
