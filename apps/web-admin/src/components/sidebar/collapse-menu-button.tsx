import { useCallback, useRef, useState } from 'react';
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
  submenus: Submenu[];
  isOpen: boolean | undefined;
  expanded: boolean;
  onToggle: () => void;
}

/** Grace period before the flyout closes so crossing the gap to the
 *  panel (or briefly leaving the row) never makes it flicker shut. */
const FLYOUT_CLOSE_DELAY_MS = 150;

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
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFlyout = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setFlyoutOpen(false);
      closeTimer.current = null;
    }, FLYOUT_CLOSE_DELAY_MS);
  }, []);

  // ── Expanded sidebar: single-open accordion row ───────────────────────
  if (!isCollapsed) {
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
                    'max-w-[150px] truncate py-0.5 text-sm font-medium',
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
          {submenus.map(({ href, label, active }, index) => {
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
                      'truncate py-0.5 text-sm',
                      isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
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
            <span
              className={cn(
                'flex items-center justify-center',
                isSubmenuActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon size={18} />
            </span>
          </Button>
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="right"
          sideOffset={4}
          align="start"
          onMouseEnter={openFlyout}
          onMouseLeave={closeFlyout}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-48 rounded-xl border border-border/70 bg-popover p-0 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=right]:slide-in-from-left-2"
        >
          {/* Section label */}
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    ? 'bg-secondary font-medium text-foreground'
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
