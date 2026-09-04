import React from 'react';

import { cn } from '@/lib/utils';

export interface UnderlineTabOption<T extends string> {
  value: T;
  label: string;
}

interface UnderlineTabsProps<T extends string> {
  options: Array<UnderlineTabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Shared status-tab strip: text tabs with a 2px active underline, compact
 * enough to share a row with search. Scrolls horizontally on narrow screens.
 * Use instead of SegmentedTabs when the toolbar must stay dense.
 */
export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Status filter',
  className,
}: UnderlineTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('no-scrollbar flex items-center gap-5 overflow-x-auto', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 border-b-2 pb-2 text-sm whitespace-nowrap transition-colors',
              isActive
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
