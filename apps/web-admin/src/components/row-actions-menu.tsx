import type { ComponentType } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';

import { cn } from '@/lib/utils';

export interface RowActionItem {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface RowActionsMenuProps {
  items: RowActionItem[];
  label?: string;
  align?: 'start' | 'end';
}

/**
 * Standard desktop row-actions kebab: one ghost trigger opening a labeled
 * menu. Use for every table with 2+ row actions (categories, vendors,
 * staff, review-queue, manage-products). Single-action rows keep their
 * inline button; mobile cards keep full-width buttons.
 */
export function RowActionsMenu({ items, label = 'Row actions', align = 'end' }: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={label}>
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.label}
              onClick={item.onSelect}
              disabled={item.disabled}
              className={cn(item.destructive && 'text-destructive focus:bg-destructive/10 focus:text-destructive')}
            >
              {Icon ? <Icon aria-hidden="true" className="mr-2 h-4 w-4" /> : null}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
