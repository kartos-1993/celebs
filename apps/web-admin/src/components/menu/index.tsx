import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';

import { MenuAccountButton } from './menu-account-button';
import { getMenuList } from './menu-data';

import { CollapseMenuButton } from '@/components/sidebar/collapse-menu-button';
import { useAuthContext } from '@/context/auth-provider';
import { cn } from '@/lib/utils';

interface MenuProps {
  isSidebarOpen: boolean | undefined;
}

export function Menu({ isSidebarOpen }: MenuProps) {
  const { role, user } = useAuthContext();
  const menuList = getMenuList(role, user?.permissions);
  const location = useLocation();
  const pathname = location.pathname;

  const isCollapsed = isSidebarOpen === false;

  // Single-open accordion: at most one submenu group expanded, so the
  // sidebar never grows beyond the viewport and needs no scrollbar.
  const findActiveGroup = (path: string): string | null => {
    for (const group of menuList) {
      for (const menu of group.menus) {
        const subs = menu.submenus ?? [];
        if (subs.some((s) => (s.active === undefined ? s.href === path : s.active))) {
          return menu.label;
        }
      }
    }
    return null;
  };

  const [expandedLabel, setExpandedLabel] = useState<string | null>(() =>
    findActiveGroup(pathname),
  );

  useEffect(() => {
    const activeGroup = findActiveGroup(pathname);
    if (activeGroup) setExpandedLabel(activeGroup);
  }, [pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="mt-2 w-full min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <ul className="flex flex-col items-start px-1 pb-2">
          {menuList.map(({ label, menus }, groupIndex) => (
            <li
              className={cn('w-full', groupIndex > 0 && (isCollapsed ? 'mt-1' : 'mt-4'))}
              key={label ?? groupIndex}
            >
              {!isCollapsed && label ? (
                <div className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              ) : null}
              <div className="flex flex-col items-start gap-0.5">
                {menus.map(({ href, label, icon: Icon, active, badge, submenus }, index) => {
                  const isActive = (active === undefined && pathname.startsWith(href)) || active;
                  return !submenus || submenus.length === 0 ? (
                    <div className="w-full" key={index}>
                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isActive ? 'secondary' : 'ghost'}
                              className={cn(
                                'h-8 w-full rounded-md',
                                isCollapsed ? 'justify-center px-0' : 'justify-start px-2',
                              )}
                              asChild
                            >
                              <Link
                                to={href}
                                prefetch="intent"
                                className={cn(
                                  'flex w-full items-center',
                                  isCollapsed ? 'justify-center' : 'gap-2',
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex shrink-0 items-center justify-center',
                                    isActive ? 'text-primary' : 'text-muted-foreground',
                                  )}
                                >
                                  <Icon size={16} />
                                </span>
                                {!isCollapsed && (
                                  <span
                                    className={cn(
                                      'min-w-0 flex-1 truncate text-sm leading-tight',
                                      isActive
                                        ? 'font-medium text-foreground'
                                        : 'font-normal text-muted-foreground',
                                    )}
                                  >
                                    {label}
                                  </span>
                                )}
                                {!isCollapsed && badge !== undefined && (
                                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                                    {badge}
                                  </span>
                                )}
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          {isCollapsed && <TooltipContent side="right">{label}</TooltipContent>}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="w-full" key={index}>
                      <CollapseMenuButton
                        icon={Icon}
                        label={label}
                        badge={badge}
                        submenus={submenus}
                        isOpen={isSidebarOpen}
                        expanded={expandedLabel === label}
                        onToggle={() => setExpandedLabel((prev) => (prev === label ? null : label))}
                      />
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Bottom: Account button (always pinned to the bottom of the viewport) ─ */}
      <div className="shrink-0 w-full border-t border-border/60 pt-2">
        <MenuAccountButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
