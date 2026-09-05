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
      {/* ── Middle: Scrollable Menu Items only ────────────────────────── */}
      <nav className="mt-4 w-full min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <ul className="flex flex-col items-start px-2 pb-2">
          {menuList.map(({ label, menus }, groupIndex) => (
            <li
              className={cn('w-full', groupIndex > 0 && (isCollapsed ? 'mt-1' : 'mt-4'))}
              key={label ?? groupIndex}
            >
              {!isCollapsed && label ? (
                <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              ) : null}
              <div className="flex flex-col items-start space-y-1">
                {menus.map(({ href, label, icon: Icon, active, submenus }, index) =>
                  !submenus || submenus.length === 0 ? (
                    <div className="w-full" key={index}>
                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                (active === undefined && pathname.startsWith(href)) || active
                                  ? 'secondary'
                                  : 'ghost'
                              }
                              className={cn(
                                'mb-1 h-9 w-full rounded-lg',
                                isCollapsed ? 'justify-center px-0' : 'justify-start px-3',
                              )}
                              asChild
                            >
                              <Link
                                to={href}
                                className={cn(
                                  'flex w-full items-center',
                                  isCollapsed ? 'justify-center' : 'gap-3',
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex shrink-0 items-center justify-center',
                                    (active === undefined && pathname.startsWith(href)) || active
                                      ? 'text-primary'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  <Icon size={18} />
                                </span>
                                {!isCollapsed && (
                                  <span
                                    className={cn(
                                      'max-w-[200px] truncate py-0.5 text-xs',
                                      (active === undefined && pathname.startsWith(href)) || active
                                        ? 'font-medium text-foreground'
                                        : 'text-muted-foreground',
                                    )}
                                  >
                                    {label}
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
                        submenus={submenus}
                        isOpen={isSidebarOpen}
                        expanded={expandedLabel === label}
                        onToggle={() => setExpandedLabel((prev) => (prev === label ? null : label))}
                      />
                    </div>
                  ),
                )}
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
