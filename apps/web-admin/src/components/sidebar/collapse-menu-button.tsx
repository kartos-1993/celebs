import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LucideIcon } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';

import { CollapseMenuFlyout, type Submenu } from './collapse-menu-flyout';

import { cn } from '@/lib/utils';

export type { Submenu };

interface CollapseMenuButtonProps {
  icon: LucideIcon;
  label: string;
  badge?: string | number;
  submenus: Submenu[];
  isOpen: boolean | undefined;
  expanded: boolean;
  onToggle: () => void;
}

export function CollapseMenuButton({
  icon: Icon,
  label,
  badge,
  submenus,
  isOpen,
  expanded,
  onToggle,
}: CollapseMenuButtonProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const isCollapsed = isOpen === false;
  const isSubmenuActive = submenus.some((submenu) =>
    submenu.active === undefined ? submenu.href === pathname : submenu.active,
  );

  // ── Collapsed sidebar: delegate to hover flyout ───────────────────────
  if (isCollapsed) {
    return <CollapseMenuFlyout icon={Icon} label={label} submenus={submenus} />;
  }

  // ── Expanded sidebar: single-open accordion row ───────────────────────
  return (
    <Collapsible open={expanded} onOpenChange={onToggle} className="w-full">
      <CollapsibleTrigger className="[&[data-state=open]>div>div>svg]:rotate-180 w-full" asChild>
        <Button
          variant={isSubmenuActive ? 'secondary' : 'ghost'}
          className="h-8 w-full justify-start rounded-md px-2"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center',
                  isSubmenuActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon size={16} />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-left text-sm leading-tight',
                  isSubmenuActive
                    ? 'font-medium text-foreground'
                    : 'font-normal text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {badge !== undefined && (
              <span className="mr-1 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {badge}
              </span>
            )}
            <ChevronDown
              size={14}
              className={cn(
                'shrink-0 transition-transform duration-200',
                isSubmenuActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-0.5 flex flex-col gap-0.5 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {submenus.map(({ href, label: subLabel, active }, index) => {
          const isActive = (active === undefined && pathname === href) || active;
          return (
            <Button
              key={index}
              variant={isActive ? 'secondary' : 'ghost'}
              className="h-8 w-full justify-start rounded-md pl-9 pr-2"
              asChild
            >
              <Link to={href} className="flex w-full items-center">
                <span
                  className={cn(
                    'truncate text-sm leading-tight',
                    isActive ? 'font-medium text-foreground' : 'font-normal text-muted-foreground',
                  )}
                >
                  {subLabel}
                </span>
              </Link>
            </Button>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
