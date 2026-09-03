import type { FormEvent } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';

import type { StatusTab } from '../types';

import { cn } from '@/lib/utils';

interface OrderFiltersProps {
  tabs: StatusTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function OrderFilters({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: OrderFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <div
        role="tablist"
        aria-label="Order status filter"
        className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            size="sm"
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => onTabChange(tab.id)}
            className={cn('shrink-0 snap-start')}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <form
        role="search"
        className="relative w-full lg:w-64 lg:shrink-0"
        onSubmit={(e: FormEvent) => e.preventDefault()}
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search orders"
          placeholder="Search order #, customer, city..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </form>
    </div>
  );
}
