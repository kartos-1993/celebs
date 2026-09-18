import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@celebs/shared-ui/components/popover';
import { ScrollArea } from '@celebs/shared-ui/components/scroll-area';

import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from '../hooks/use-notification-mutations';
import {
  useNotificationInbox,
  useUnreadNotificationCount,
} from '../hooks/use-notification-queries';
import type { NotificationFilterTab, NotificationItemUI } from '../types';

import { NotificationBell } from './notification-bell';
import { NotificationItem } from './notification-item';

import { cn } from '@/lib/utils';

export function NotificationPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationFilterTab>('all');

  const { count, hasCritical } = useUnreadNotificationCount();
  const { data, isLoading } = useNotificationInbox(
    { unreadOnly: tab === 'unread', limit: 20 },
    open,
  );

  const markReadMutation = useMarkNotificationAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();

  const rawItems = Array.isArray(data)
    ? data
    : ((data as { items?: NotificationItemUI[] })?.items ?? []);
  const items: NotificationItemUI[] = Array.isArray(rawItems) ? rawItems : [];

  const handleItemSelect = (item: NotificationItemUI) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    setOpen(false);

    const itemData = item.data;
    const url = typeof itemData?.url === 'string' ? itemData.url : undefined;
    const orderId = itemData?.orderId as string | undefined;

    if (orderId || url?.includes('/orders')) {
      navigate('/orders');
    } else if (url && url.startsWith('/')) {
      navigate(url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <NotificationBell count={count} hasCritical={hasCritical} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-lg border-border/70"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {count > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {count} new
              </span>
            )}
          </div>

          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck size={14} />
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex border-b border-border/50 px-4 gap-4 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={cn(
              'py-2 border-b-2 transition-colors',
              tab === 'all'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent hover:text-foreground',
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab('unread')}
            className={cn(
              'py-2 border-b-2 transition-colors',
              tab === 'unread'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent hover:text-foreground',
            )}
          >
            Unread ({count})
          </button>
        </div>

        <ScrollArea className="h-80">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <p className="font-medium text-foreground">No notifications</p>
                <p>You are all caught up!</p>
              </div>
            ) : (
              items.map((item) => (
                <NotificationItem key={item.id} item={item} onSelect={handleItemSelect} />
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
