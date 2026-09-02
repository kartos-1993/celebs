import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { useAuthContext } from '@/context/auth-provider';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { logout } from '@/features/auth/api';

export function UserNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { mutate, isPending: isLoggingOut } = useMutation({
    mutationFn: logout,
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

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'JD';

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="#" alt="Avatar" />
                  <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className="w-52" align="end" forceMount>
        {user?.email && (
          <>
            <DropdownMenuLabel className="font-normal py-1.5 px-2">
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link to="/account/profile">Profile</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="hover:cursor-pointer text-destructive focus:text-destructive"
          onClick={() => mutate()}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
