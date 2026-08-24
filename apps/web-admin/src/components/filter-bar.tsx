import React from 'react';
import { Search } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';

/**
 * Standard list-page toolbar: one card row holding the search field (left)
 * and segmented status filters (right). Pair with <FilterSearch /> and
 * <SegmentedTabs />. Reference: features/vendors/pages/vendor-list-page.tsx.
 */
export function FilterBar({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Debounce-friendly controlled search input with leading icon. */
export function FilterSearch({ value, onChange, placeholder, className }: FilterSearchProps) {
  return (
    <div className="relative w-full sm:max-w-md min-w-0">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? 'Search...'}
        className={`pl-10 ${className ?? ''}`}
      />
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Status switcher for list pages — solid primary pill for the active option,
 * ghost for the rest (the "black tabs" house style).
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isActive ? 'default' : 'ghost'}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
