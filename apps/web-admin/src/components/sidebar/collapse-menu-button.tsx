import { useCallback,useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, LucideIcon } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';

import { cn } from '@/lib/utils';

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
  active: _active,
  submenus,
  isOpen,
}: CollapseMenuButtonProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const isCollapsed = isOpen === false;
  const isSubmenuActive = submenus.some((submenu) =>
    submenu.active === undefined ? submenu.href === pathname : submenu.active,
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(isSubmenuActive);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const openFlyout = useCallback(() => setFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setFlyoutOpen(false), []);

  // ── Expanded sidebar: collapsible tree ──────────────────────────────────
  if (!isCollapsed) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="w-full">
        <CollapsibleTrigger
          className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1 w-full"
          asChild
        >
          <Button
            variant={isSubmenuActive ? 'secondary' : 'ghost'}
            className="w-full justify-start h-10 px-3"
          >
            <div className="w-full items-center flex justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </span>
                <p className="max-w-[150px] truncate text-sm font-medium py-0.5">{label}</p>
              </div>
              <div className="flex items-center justify-center shrink-0 ml-2">
                <ChevronDown size={16} className="transition-transform duration-200" />
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          {submenus.map(({ href, label, active }, index) => {
            const isActive = (active === undefined && pathname === href) || active;
            return (
              <Button
                key={index}
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start h-8 mb-1 pl-9 pr-3"
                asChild
              >
                <Link to={href} className="flex items-center w-full">
                  <p
                    className={cn(
                      'max-w-[170px] truncate text-sm py-0.5',
                      isActive
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </p>
                </Link>
              </Button>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // ── Collapsed sidebar: pure hover flyout (no click toggle) ───────────────
  // Use PopoverPrimitive.Anchor so Radix knows where to position content
  // but the trigger has NO click handler — hover-only via wrapper div.
  return (
    <PopoverPrimitive.Root open={flyoutOpen}>
      <PopoverPrimitive.Anchor asChild>
        {/* Hover zone: full-width row */}
        <div className="w-full" onMouseEnter={openFlyout} onMouseLeave={closeFlyout}>
          <Button
            variant={isSubmenuActive ? 'secondary' : 'ghost'}
            className="w-full justify-center h-10 mb-1 px-0 pointer-events-none"
            tabIndex={-1}
          >
            <span className="flex items-center justify-center">
              <Icon size={18} />
            </span>
          </Button>
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="right"
          sideOffset={8}
          align="start"
          onMouseEnter={openFlyout}
          onMouseLeave={closeFlyout}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-48 rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=right]:slide-in-from-left-2 p-0"
        >
          {/* Section label */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
            {label}
          </div>
          {/* Submenu links */}
          <div className="py-1">
            {submenus.map(({ href, label, active }, index) => (
              <Link
                key={index}
                to={href}
                onClick={closeFlyout}
                className={cn(
                  'flex items-center px-3 py-2 text-sm transition-colors',
                  (active === undefined && pathname === href) || active
                    ? 'bg-secondary text-secondary-foreground font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
