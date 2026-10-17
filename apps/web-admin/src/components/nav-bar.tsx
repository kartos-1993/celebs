import React from 'react';
import { Link, useMatches } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@celebs/shared-ui/components/breadcrumbs';

import { SheetMenu } from './sheet-menu';

import { useSidebarContext } from '@/context/sidebar-provider';
import { NotificationPopover } from '@/features/notifications/components/notification-popover';
import { cn } from '@/lib/utils';

interface RouteHandle {
  crumb?: string;
}

export function Navbar() {
  const { isSidebarOpen } = useSidebarContext();
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
          <BreadcrumbLink asChild>
            <Link to={match.pathname}>{handle.crumb}</Link>
          </BreadcrumbLink>
          <BreadcrumbSeparator />
        </React.Fragment>
      );
    });

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md transition-[margin-left] ease-in-out duration-300 md:px-6',
        isSidebarOpen ? 'md:ml-64' : 'md:ml-[76px]',
      )}
    >
      <div className="flex h-12 items-center gap-4">
        {/* Mobile hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <SheetMenu />
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 flex-1">
          <Breadcrumb>
            <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Notification bell */}
        <div className="flex items-center">
          <NotificationPopover />
        </div>
      </div>
    </header>
  );
}
