import { useSideBarContext } from '@/context/sidebar-provider';
import { cn } from '@/lib/utils';
import React from 'react';

type MainProps = {
  children: React.ReactNode;
};
const Main = ({ children }: MainProps) => {
  const { isSideBarOpen } = useSideBarContext();
  return (
    <main
      className={cn(
        'pt-8 px-6 min-h-[calc(100vh-58px)] bg-zinc-50 dark:bg-zinc-950 transition-[margin-left] ease-in-out duration-300',
        isSideBarOpen ? 'lg:ml-64' : 'lg:ml-[81px]',
      )}
    >
      {children}
    </main>
  );
};
export default Main;
// settings.disabled &&
// getOpenState() ? "lg:ml-[90px]" : "lg:ml-72")
