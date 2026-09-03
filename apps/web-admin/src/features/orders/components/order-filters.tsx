import type { StatusTab } from '../types';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';

interface OrderFiltersProps {
  tabs: StatusTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

/** Orders toolbar — search left, status filters right (shared FilterBar standard). */
export function OrderFilters({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: OrderFiltersProps) {
  return (
    <FilterBar>
      <FilterSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search order #, customer, city..."
      />
      <SegmentedTabs
        options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
        value={activeTab}
        onChange={onTabChange}
        ariaLabel="Order status filter"
      />
    </FilterBar>
  );
}
