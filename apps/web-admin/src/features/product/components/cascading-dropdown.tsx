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
  isDirty?: boolean | (() => boolean);
}

/**
 * The RHF field this dropdown IS. It matches the `FormField name` in
 * `BasicInfoSection`, which is the only place `CascadingDropdown` is rendered.
 *
 * It has to be declared here because shared-ui's `FormControl` clones its child
 * through Radix `Slot` and only forwards `id`/`aria-*` — no `name` and no
 * `data-field-name` reach the DOM, so `form-focus.locateErrorElement` had
 * nothing to resolve for the required `subcategoryId` path.
 */
const CATEGORY_FIELD_NAME = 'subcategoryId';

export const CascadingDropdown: React.FC<CascadingDropdownProps> = ({
  onSelect,
  placeholder = 'Please select category or search with keyword',
  selectedCategory,
  isDirty = false,
}) => {
  const state = useCascadingDropdownState({ selectedCategory, isDirty, onSelect });
  const showColumns = state.globalSearchQuery.trim().length === 0;

  return (
    // `tabIndex={-1}`: this is the element `FormControl`'s Slot props land on,
    // so it is the focus target for the `subcategoryId` error. Out of the tab
    // order (the trigger button is the interactive element), but focusable
    // programmatically by `form-focus`.
    <div className="space-y-2" tabIndex={-1}>
      <Popover open={state.isOpen} onOpenChange={state.handleOpenChange}>
        <PopoverTrigger asChild>
          <CategoryTrigger
            data-field-name={CATEGORY_FIELD_NAME}
            selectedCategory={selectedCategory}
            placeholder={placeholder}
          />
        </PopoverTrigger>

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

      <RecentChips recentCategories={state.recentCategories} onSelect={state.handleRecentSelect} />

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
