import { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@celebs/shared-ui/components/button';
import { DropdownMenuArrow } from '@radix-ui/react-dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@celebs/shared-ui/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@celebs/shared-ui/components/dropdown-menu';

import { Link, useLocation } from 'react-router-dom';

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

interface CollapseMenuButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  submenus: Submenu[];
  isOpen: boolean | undefined;
}

export function CollapseMenuButton({
  icon: Icon,
  label,
  active,
  submenus,
  isOpen,
}: CollapseMenuButtonProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const isSubmenuActive = submenus.some((submenu) =>
    submenu.active === undefined ? submenu.href === pathname : submenu.active,
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive);

  // ── Expanded sidebar: collapsible tree ──────────────────────────────────
  return isOpen ? (
    <Collapsible open={isCollapsed} onOpenChange={setIsCollapsed} className="w-full">
      <CollapsibleTrigger className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1 w-full" asChild>
        <Button
          variant={isSubmenuActive ? 'secondary' : 'ghost'}
          className="w-full justify-start h-10 px-3"
        >
          <div className="w-full items-center flex justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center shrink-0">
                <Icon size={18} />
              </span>
              <p
                className={cn(
                  'max-w-[150px] truncate text-sm font-medium py-0.5',
                  isOpen ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0',
                )}
              >
                {label}
              </p>
            </div>
            <div
              className={cn(
                'flex items-center justify-center shrink-0 ml-2',
                isOpen ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0',
              )}
            >
              <ChevronDown size={16} className="transition-transform duration-200" />
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {submenus.map(({ href, label, active }, index) => (
          <Button
            key={index}
            variant={(active === undefined && pathname === href) || active ? 'secondary' : 'ghost'}
            className="w-full justify-start h-8 mb-1 pl-9 pr-3"
            asChild
          >
            <Link to={href} className="flex items-center w-full">
              <p
                className={cn(
                  'max-w-[170px] truncate text-sm font-light py-0.5',
                  isOpen ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0',
                )}
              >
                {label}
              </p>
            </Link>
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ) : (
    // ── Collapsed sidebar: dropdown flyout with submenu items ─────────────
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isSubmenuActive ? 'secondary' : 'ghost'}
                className="w-full justify-center h-10 mb-1 px-0"
              >
                <span className="flex items-center justify-center">
                  <Icon size={18} />
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {/* Only show simple tooltip when no submenus visible */}
          <TooltipContent side="right" align="start" alignOffset={2}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent side="right" sideOffset={20} align="start" className="min-w-[180px]">
        <DropdownMenuLabel className="max-w-[190px] truncate text-sm font-medium py-1">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {submenus.map(({ href, label, active }, index) => (
          <DropdownMenuItem key={index} asChild>
            <Link
              to={href}
              className={cn(
                'cursor-pointer w-full',
                (active === undefined && pathname === href) || active ? 'bg-secondary' : '',
              )}
            >
              <p className="max-w-[180px] truncate text-sm font-light py-0.5">{label}</p>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuArrow className="fill-border" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
