import React from 'react';
import { UserNav } from '@/components/user-nav';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumbs';
import { useMatches, Link } from 'react-router-dom';
import { SheetMenu } from './sheet-menu';
import { useSideBarContext } from '@/context/sidebar-provider';
import { cn } from '@/lib/utils';

// Refine the type of match.handle
interface RouteHandle {
  crumb?: string;
}

export function Navbar() {
  const { isSideBarOpen } = useSideBarContext();
  const matches = useMatches();

  const breadcrumbs = matches
    .filter((match) => (match.handle as RouteHandle)?.crumb)
    .map((match, index, array) => {
      const handle = match.handle as RouteHandle;
      const isLast = index === array.length - 1;
      return isLast ? (
        <BreadcrumbPage key={match.pathname}>{handle.crumb}</BreadcrumbPage>
      ) : (
        <React.Fragment key={match.pathname}>
          <BreadcrumbLink href={match.pathname}>{handle.crumb}</BreadcrumbLink>
          <BreadcrumbSeparator />
        </React.Fragment>
      );
    });

  return (
    <header
      className={cn(
        `pl-6 sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary`,
        isSideBarOpen ? 'lg:ml-64' : 'lg:ml-[81px]',
      )}
    >
      <div className=" lg:mr-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <Breadcrumb>
            <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
