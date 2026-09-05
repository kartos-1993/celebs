import { Search } from 'lucide-react';

import type { DropdownCategory } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { formatCategoryPath } from '../../utils/category-dropdown-helpers';

interface CategorySearchPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  results: DropdownCategory[];
  isSearching: boolean;
  onSelectResult: (category: DropdownCategory) => void;
}

export function CategorySearchPanel({
  query,
  onQueryChange,
  results,
  isSearching,
  onSelectResult,
}: CategorySearchPanelProps) {
  return (
    <>
      <div className="relative shrink-0">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search categories globally..."
          aria-label="Search categories globally"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-9 pl-10 text-sm"
        />
        {isSearching && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <Spinner size="default" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-40 shrink-0 overflow-y-auto rounded-lg border">
          <div className="border-b px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Search Results
          </div>
          <div className="p-1">
            {results.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start px-2"
                onClick={() => onSelectResult(category)}
              >
                <span className="truncate">{formatCategoryPath(category.path)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
