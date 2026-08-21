import { LogOut, Sun, Moon, User, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMenuList } from './menu-data';
import { Button } from '@celebs/shared-ui/components/button';
import { ScrollArea } from '@celebs/shared-ui/components/scroll-area';
import { CollapseMenuButton } from '@/components/sidebar/collapse-menu-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@celebs/shared-ui/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout as logoutApi } from '@/features/auth/api';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { useAuthContext } from '@/context/auth-provider';
import { useTheme } from '@/context/theme-provider';

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
  const { mutate: logout } = useMutation({
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
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 h-full w-full">
        <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">
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
                              'w-full h-10 mb-1 px-3',
                              isCollapsed ? 'justify-center' : 'justify-start',
                            )}
                            asChild
                          >
                            <Link
                              to={href}
                              className={cn(
                                'flex items-center w-full',
                                isCollapsed ? 'justify-center' : 'gap-3',
                              )}
                            >
                              <span className="flex items-center justify-center shrink-0">
                                <Icon size={18} />
                              </span>
                              {!isCollapsed && (
                                <p className="max-w-[200px] truncate text-sm font-medium py-0.5">
                                  {label}
                                </p>
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
                      active={active === undefined ? pathname.startsWith(href) : active}
                      submenus={submenus}
                      isOpen={isSidebarOpen}
                    />
                  </div>
                ),
              )}
            </li>
          ))}

          {/* ── Bottom: profile / menu ──────────────────────────────────── */}
          <li className="w-full grow flex items-end pb-1">
            <DropdownMenu>
              <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full h-10 mt-5',
                          isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3',
                        )}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src="#" alt="Avatar" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {!isCollapsed && (
                          <div className="flex flex-col items-start leading-none">
                            <p className="text-sm font-medium truncate max-w-[120px]">
                              {user?.name || 'My Account'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {user?.role || ''}
                            </p>
                          </div>
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
                className="w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                      {user?.role && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/account/profile" className="flex items-center cursor-pointer">
                      <User className="w-4 h-4 mr-3 text-muted-foreground" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center cursor-pointer">
                      <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
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
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 mr-3 text-muted-foreground" />
                  ) : (
                    <Moon className="w-4 h-4 mr-3 text-muted-foreground" />
                  )}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        </ul>
      </nav>
    </ScrollArea>
  );
}
