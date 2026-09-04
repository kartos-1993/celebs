import React from 'react';
import { Search } from 'lucide-react';

import { Input } from '@celebs/shared-ui/components/input';

import { REVIEW_QUEUE_TABS, type ReviewQueueTab } from '../../hooks/use-review-queue-state';

import { UnderlineTabs } from '@/components/underline-tabs';

interface QueueFilterBarProps {
  activeTab: ReviewQueueTab;
  onTab: (tab: ReviewQueueTab) => void;
  searchInput: string;
  onSearch: (value: string) => void;
  showSearch: boolean;
}

export const QueueFilterBar: React.FC<QueueFilterBarProps> = ({
  activeTab,
  onTab,
  searchInput,
  onSearch,
  showSearch,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card px-4 pt-3 shadow-sm">
      <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <UnderlineTabs
          options={REVIEW_QUEUE_TABS}
          value={activeTab}
          onChange={onTab}
          ariaLabel="Review queue filter"
        />

        {showSearch && (
          <div className="relative w-full lg:w-56 lg:shrink-0">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search by title, brand or vendor..."
              aria-label="Search listings"
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
};
