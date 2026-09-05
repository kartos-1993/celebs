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
  submenus: Submenu[];
  isOpen: boolean | undefined;
  expanded: boolean;
  onToggle: () => void;
}

export function CollapseMenuButton({
  icon: Icon,
  label,
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
      <CollapsibleTrigger
        className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1 w-full"
        asChild
      >
        <Button
          variant={isSubmenuActive ? 'secondary' : 'ghost'}
          className="h-9 w-full justify-start rounded-lg px-3"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center',
                  isSubmenuActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon size={18} />
              </span>
              <span
                className={cn(
                  'max-w-[150px] truncate py-0.5 text-xs font-medium',
                  isSubmenuActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            <ChevronDown
              size={15}
              className={cn(
                'ml-2 shrink-0 transition-transform duration-200',
                isSubmenuActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {submenus.map(({ href, label: subLabel, active }, index) => {
          const isActive = (active === undefined && pathname === href) || active;
          return (
            <Button
              key={index}
              variant={isActive ? 'secondary' : 'ghost'}
              className="mb-0.5 h-8 w-full justify-start rounded-lg pl-[38px] pr-3"
              asChild
            >
              <Link to={href} className="flex w-full items-center">
                <span
                  className={cn(
                    'truncate py-0.5 text-xs',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
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
