import React from 'react';
import { Bell } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { cn } from '@/lib/utils';

export interface NotificationBellProps {
  count?: number;
  hasCritical?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NotificationBell = React.forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ count = 0, hasCritical = false, onClick, className, ...props }, ref) => {
    const formattedCount = count > 99 ? '99+' : String(count);

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        aria-label={`Notifications (${count} unread)`}
        onClick={onClick}
        className={cn('relative h-8 w-8 rounded-full focus-visible:ring-2', className)}
        {...props}
      >
        <Bell size={18} />

        {count > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground tabular-nums leading-none"
          >
            {formattedCount}
          </span>
        )}

        {hasCritical && (
          <span
            data-testid="critical-indicator"
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive/60 animate-ping pointer-events-none"
          />
        )}
      </Button>
    );
  },
);

NotificationBell.displayName = 'NotificationBell';
