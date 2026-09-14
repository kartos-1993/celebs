import { Search } from 'lucide-react';

import { Input } from '@celebs/shared-ui/components/input';

import type { StatusTab } from '../types';

import { UnderlineTabs } from '@/components/underline-tabs';

interface OrderFiltersProps {
  tabs: StatusTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

/** Orders toolbar — underline status tabs with compact search right. */
export function OrderFilters({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: OrderFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 pt-3 shadow-sm">
      <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <UnderlineTabs
          options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
          value={activeTab}
          onChange={onTabChange}
          ariaLabel="Order status filter"
        />

        <div className="relative w-full lg:w-56 lg:shrink-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search order #, customer, city..."
            aria-label="Search orders"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
