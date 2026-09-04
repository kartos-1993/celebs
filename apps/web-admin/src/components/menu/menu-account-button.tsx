import { Link } from 'react-router-dom';
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

import { useAuthContext } from '@/context/auth-provider';
import { useTheme } from '@/context/theme-provider';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';

interface MenuAccountButtonProps {
  isCollapsed: boolean;
}

export function MenuAccountButton({ isCollapsed }: MenuAccountButtonProps) {
  const { user } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ME';

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-10 w-full',
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
  );
}
