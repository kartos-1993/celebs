import React from 'react';

import { formatRelativeTime, getSeverityBadgeStyles } from '../lib/notification-format.util';
import type { NotificationItemUI } from '../types';

import { cn } from '@/lib/utils';

export interface NotificationItemProps {
  item: NotificationItemUI;
  onSelect?: (item: NotificationItemUI) => void;
  onMarkRead?: (id: string) => void;
}

export function NotificationItem({ item, onSelect, onMarkRead }: NotificationItemProps) {
  const { dotColor } = getSeverityBadgeStyles(item.severity);
  const timeFormatted = formatRelativeTime(item.createdAt);

  const handleClick = () => {
    if (onSelect) {
      onSelect(item);
    } else if (!item.read && onMarkRead) {
      onMarkRead(item.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors border border-transparent flex gap-3 items-start',
        item.read ? 'opacity-70 hover:bg-muted/50' : 'bg-muted/30 hover:bg-muted/70 font-normal',
      )}
    >
      <div className="mt-1 flex-shrink-0">
        <span className={cn('block h-2 w-2 rounded-full', dotColor)} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate leading-tight">{item.title}</p>
          <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">
            {timeFormatted}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-normal">{item.body}</p>
      </div>
    </button>
  );
}
