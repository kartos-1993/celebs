import type { DropdownCategory } from '@celebs/shared-types';
import { Popover, PopoverContent, PopoverTrigger } from '@celebs/shared-ui/components/popover';

import { useCascadingDropdownState } from '../hooks/use-cascading-dropdown-state';

import { CategoryChangeDialog } from './category-dropdown/category-change-dialog';
import { CategoryColumns } from './category-dropdown/category-columns';
import { CategorySearchPanel } from './category-dropdown/category-search-panel';
import { CategorySelectionFooter } from './category-dropdown/category-selection-footer';
import { CategoryTrigger } from './category-dropdown/category-trigger';
import { RecentChips } from './category-dropdown/recent-chips';

export interface CascadingDropdownProps {
  onSelect?: (category: DropdownCategory) => void;
  placeholder?: string;
  selectedCategory?: DropdownCategory | null;
  isDirty?: boolean;
}

export const CascadingDropdown: React.FC<CascadingDropdownProps> = ({
  onSelect,
  placeholder = 'Please select category or search with keyword',
  selectedCategory,
  isDirty = false,
}) => {
  const state = useCascadingDropdownState({ selectedCategory, isDirty, onSelect });
  const showColumns = state.globalSearchQuery.trim().length === 0;

  return (
    <div className="space-y-2">
      <Popover open={state.isOpen} onOpenChange={state.handleOpenChange}>
        <PopoverTrigger asChild>
          <CategoryTrigger selectedCategory={selectedCategory} placeholder={placeholder} />
        </PopoverTrigger>

        <RecentChips
          recentCategories={state.recentCategories}
          onSelect={state.handleRecentSelect}
          className="pt-1"
        />

        <PopoverContent
          className="max-h-[var(--radix-popover-content-available-height)] w-[min(800px,95vw)] overflow-hidden p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="flex max-h-[var(--radix-popover-content-available-height)] flex-col space-y-3 overflow-hidden p-3 sm:p-4">
            <CategorySearchPanel
              query={state.globalSearchQuery}
              onQueryChange={state.setGlobalSearchQuery}
              results={state.searchResults}
              isSearching={state.isSearching}
              onSelectResult={state.handleGlobalResultSelect}
            />

            {showColumns && (
              <RecentChips
                recentCategories={state.recentCategories}
                onSelect={state.handleRecentSelect}
              />
            )}

            {showColumns && (
              <CategoryColumns
                columns={state.columns}
                getCategoriesForColumn={state.getCategoriesForColumn}
                selectedPath={state.selectedPath}
                tempSelectedPath={state.tempSelectedPath}
                onCategoryClick={state.handleCategoryClick}
                onColumnSearch={state.handleColumnSearch}
              />
            )}

            <CategorySelectionFooter
              currentSelectionText={state.currentSelectionText}
              canConfirm={state.canConfirm}
              onCancel={state.resetDropdownState}
              onConfirm={state.handleConfirm}
            />
          </div>
        </PopoverContent>
      </Popover>

      <CategoryChangeDialog
        open={state.isConfirmModalOpen}
        onOpenChange={(open) => {
          if (!open) state.handleConfirmModalCancel();
        }}
        pendingCategoryName={state.pendingCategory?.name ?? 'the new category'}
        onCancel={state.handleConfirmModalCancel}
        onProceed={state.handleConfirmModalProceed}
      />
    </div>
  );
};
