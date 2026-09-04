import { useCallback, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { LucideIcon } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { cn } from '@/lib/utils';

export type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

interface CollapseMenuFlyoutProps {
  icon: LucideIcon;
  label: string;
  submenus: Submenu[];
}

const FLYOUT_CLOSE_DELAY_MS = 150;

export function CollapseMenuFlyout({ icon: Icon, label, submenus }: CollapseMenuFlyoutProps) {
  const location = useLocation();
  const pathname = location.pathname;
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

  return (
    <PopoverPrimitive.Root open={flyoutOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className="w-full" onMouseEnter={openFlyout} onMouseLeave={closeFlyout}>
          <Button
            variant={isSubmenuActive ? 'secondary' : 'ghost'}
            className={cn(
              'mb-1 h-9 w-full justify-center rounded-lg px-0 transition-colors',
              flyoutOpen && 'bg-accent text-accent-foreground',
            )}
            tabIndex={-1}
          >
            <span
              className={cn(
                'flex items-center justify-center',
                isSubmenuActive || flyoutOpen ? 'text-primary' : 'text-muted-foreground',
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
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="py-1">
            {submenus.map(({ href, label: subLabel, active }, index) => (
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
                {subLabel}
              </Link>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
