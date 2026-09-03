import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';

import { getMenuList } from './menu-data';

import { CollapseMenuButton } from '@/components/sidebar/collapse-menu-button';
import { useAuthContext } from '@/context/auth-provider';
import { useTheme } from '@/context/theme-provider';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { logout as logoutApi } from '@/features/auth/api';
import { cn } from '@/lib/utils';

interface MenuProps {
  isSidebarOpen: boolean | undefined;
}

export function Menu({ isSidebarOpen }: MenuProps) {
  const { role, user } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const menuList = getMenuList(role, user?.permissions);
  const location = useLocation();
  const pathname = location.pathname;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(ACCOUNT_QUERY_KEYS.userSession(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== ACCOUNT_QUERY_KEYS.all[0],
      });
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && currentPath !== '/' && currentPath !== '/login') {
        const returnUrl = encodeURIComponent(currentPath);
        navigate(`/login?returnUrl=${returnUrl}`);
      } else {
        navigate('/login');
      }
    },
  });

  const isCollapsed = isSidebarOpen === false;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ME';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="mt-6 w-full flex-1">
        <ul className="flex h-full flex-col items-start space-y-1 px-2">
          {menuList.map(({ menus }, index) => (
            <li className={cn('w-full')} key={index}>
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
                                    'max-w-[200px] truncate py-0.5 text-sm',
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
                    />
                  </div>
                ),
              )}
            </li>
          ))}

          {/* ── Bottom: account row (text-only, Apple-minimal) ─────────── */}
          <li className="mt-auto w-full pt-3">
            <DropdownMenu>
              <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'h-10 mt-5 w-full',
                          isCollapsed ? 'justify-center px-0' : 'justify-between px-3',
                        )}
                      >
                        {isCollapsed ? (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials}
                          </span>
                        ) : (
                          <>
                            <span className="flex min-w-0 flex-col items-start leading-tight">
                              <span className="max-w-[140px] truncate text-sm font-medium">
                                {user?.name || 'My Account'}
                              </span>
                              <span className="max-w-[140px] truncate text-xs text-muted-foreground">
                                {user?.role || ''}
                              </span>
                            </span>
                            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">My Account</TooltipContent>}
                </Tooltip>
              </TooltipProvider>

              <DropdownMenuContent
                side={isCollapsed ? 'right' : 'top'}
                align={isCollapsed ? 'start' : 'end'}
                sideOffset={8}
                className="w-52"
              >
                {user?.email && (
                  <>
                    <DropdownMenuLabel className="font-normal py-1.5 px-2">
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/account/profile" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Theme toggle */}
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="cursor-pointer"
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        </ul>
      </nav>
    </div>
  );
}
