import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@celebs/shared-ui/components/popover';
import { ScrollArea } from '@celebs/shared-ui/components/scroll-area';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import { logger } from '@celebs/shared-utils';

import { useCategoryTree } from '../hooks/use-category-tree';
import type { DropdownCategory, RecentCategory } from '../types';

import { CategoryApiService } from '@/features/category/api';
import { cn } from '@/lib/utils';

// Canonical types live in ../types — aliases kept for backwards compatibility
export type { DropdownCategory as Category, RecentCategory } from '../types';
export type CategoryNode = DropdownCategory & { children?: CategoryNode[] };

// eslint-disable-next-line react-refresh/only-export-components
export function formatCategoryPath(path: string[] | string | undefined | null): string {
  if (!path) return '';
  if (Array.isArray(path)) return path.join(' > ');
  if (typeof path === 'string') return path.split('/').join(' > ');
  return String(path);
}

interface ColumnData {
  parentId: string | null;
  parentName: string;
  searchQuery: string;
}

interface CascadingDropdownProps {
  onSelect?: (category: DropdownCategory) => void;
  placeholder?: string;
  selectedCategory?: DropdownCategory | null;
  onSearch?: (query: string) => Promise<DropdownCategory[]>;
  isDirty?: boolean;
}

export const CascadingDropdown: React.FC<CascadingDropdownProps> = ({
  onSelect,
  placeholder = 'Please select category or search with keyword',
  selectedCategory,
  onSearch,
  isDirty = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnData[]>([
    { parentId: null, parentName: 'Categories', searchQuery: '' },
  ]);
  const [selectedPath, setSelectedPath] = useState<DropdownCategory[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [tempSelectedPath, setTempSelectedPath] = useState<DropdownCategory[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<DropdownCategory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const {
    getRootCategories,
    getChildCategories,
    searchCategories,
    recentCategories,
    addToRecent,
    findCategoryById,
  } = useCategoryTree();

  // ── FIX: clear the pending global-search timer on unmount ─────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  // Helper: collect all leaf descendants for a given parent id
  const collectLeafDescendants = (parentId: string): DropdownCategory[] => {
    const result: DropdownCategory[] = [];
    const dfs = (node: DropdownCategory) => {
      const kids = getChildCategories(node.id);
      if (!kids || kids.length === 0) {
        result.push(node);
      } else {
        for (const kid of kids) dfs(kid);
      }
    };
    getChildCategories(parentId).forEach(dfs);
    return result;
  };

  // Helper: resolve a category to local tree by its path segments
  const resolveLocalByPath = (
    rawPath: string[] | string | undefined | null,
  ): DropdownCategory | undefined => {
    if (!rawPath) return undefined;
    const segments = Array.isArray(rawPath)
      ? rawPath
      : typeof rawPath === 'string'
        ? rawPath.split('/')
        : [];
    if (segments.length === 0) return undefined;

    let parentId: string | null = null;
    let last: DropdownCategory | undefined;
    for (const name of segments) {
      const candidates: DropdownCategory[] =
        parentId === null ? getRootCategories() : getChildCategories(parentId);
      const match: DropdownCategory | undefined = candidates.find(
        (c: DropdownCategory) => c.name === name || c.slug === name,
      );
      if (!match) return undefined;
      last = match;
      parentId = match.id;
    }
    return last;
  };

  const expandToCategory = (category: DropdownCategory, columnIndex: number) => {
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(category);
    setSelectedPath(newPath);
    // Clear any previous leaf selection when navigating non-leaf levels
    setTempSelectedPath([]);

    if (category.hasChildren) {
      const newColumns = columns.slice(0, columnIndex + 1);
      newColumns.push({ parentId: category.id, parentName: category.name, searchQuery: '' });
      setColumns(newColumns);
    }
  };

  const handleCategoryClick = (category: DropdownCategory, columnIndex: number) => {
    if (category.hasChildren) {
      expandToCategory(category, columnIndex);
      return;
    }
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(category);
    setTempSelectedPath(newPath);
  };

  const handleSearchChange = (value: string, columnIndex: number) => {
    const newColumns = [...columns];
    newColumns[columnIndex].searchQuery = value;
    setColumns(newColumns);
  };

  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearchQuery(value);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!value.trim()) {
      setGlobalSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const query = value;

    debounceRef.current = window.setTimeout(async () => {
      try {
        let results: DropdownCategory[] = [];
        if (onSearch) {
          results = await onSearch(query);
        } else {
          const apiResults = await CategoryApiService.searchCategories(query);
          results = apiResults.map(
            (c: {
              id: string;
              name: string;
              parentCategory?: string | null;
              hasChildren?: boolean;
              level?: number;
              path?: string[] | string;
            }) => ({
              id: c.id,
              name: c.name,
              parentCategory: c.parentCategory ?? null,
              hasChildren: !!c.hasChildren,
              level:
                c.level ??
                (Array.isArray(c.path)
                  ? c.path.length - 1
                  : typeof c.path === 'string'
                    ? c.path.split('/').length - 1
                    : 0),
              path: Array.isArray(c.path)
                ? c.path
                : typeof c.path === 'string'
                  ? c.path.split('/')
                  : [c.name],
            }),
          );
        }

        // Expand matched parent categories into their leaf descendants
        const expandedLeaves: DropdownCategory[] = [];
        for (const result of results) {
          let local: DropdownCategory | undefined = result.id
            ? findCategoryById?.(result.id)
            : undefined;
          if (!local) {
            local = resolveLocalByPath(result.path);
          }
          if (local) {
            const children = getChildCategories(local.id);
            if (!children || children.length === 0) {
              expandedLeaves.push(local);
            } else {
              expandedLeaves.push(...collectLeafDescendants(local.id));
            }
          }
        }

        const deduped = Array.from(new Map(expandedLeaves.map((c) => [c.id, c])).values());
        setGlobalSearchResults(deduped);
      } catch (error) {
        // FIX: was an empty catch — now logged per project convention
        logger.error({ error, query }, 'Global category search failed');
        setGlobalSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Build and apply columns/paths from a category.path
  const applyPathSelection = (category: DropdownCategory) => {
    const byId = category.id ? findCategoryById?.(category.id) : undefined;
    let finalPath: DropdownCategory[] = [];

    if (byId) {
      // Walk up via parentCategory to construct full path
      const chain: DropdownCategory[] = [];
      let node: DropdownCategory | undefined = byId;
      while (node) {
        chain.unshift(node);
        node = node.parentCategory ? findCategoryById?.(node.parentCategory) : undefined;
      }
      finalPath = chain;
    } else {
      const pathSegments = Array.isArray(category.path)
        ? category.path
        : typeof category.path === 'string'
          ? category.path.split('/')
          : [];
      if (pathSegments.length === 0) {
        setTempSelectedPath([category]);
        return;
      }
      const resolvedPath: DropdownCategory[] = [];
      for (let i = 0; i < pathSegments.length; i++) {
        const name = pathSegments[i];
        const parentId = i === 0 ? null : (resolvedPath[i - 1]?.id ?? null);
        const candidates: DropdownCategory[] =
          parentId === null ? getRootCategories() : getChildCategories(parentId);
        const match: DropdownCategory | undefined = candidates.find(
          (c: DropdownCategory) => c.name === name || c.slug === name,
        );
        if (!match) break;
        resolvedPath.push(match);
      }
      finalPath = resolvedPath.length > 0 ? resolvedPath : [category];
    }

    const newColumns: ColumnData[] = [
      { parentId: null, parentName: 'Categories', searchQuery: '' },
    ];
    for (let i = 0; i < finalPath.length; i++) {
      const node = finalPath[i];
      const isLast = i === finalPath.length - 1;
      if (!isLast || node.hasChildren) {
        newColumns.push({ parentId: node.id, parentName: node.name, searchQuery: '' });
      }
    }

    setSelectedPath(finalPath);
    const isLeaf = finalPath.length > 0 && !finalPath[finalPath.length - 1].hasChildren;
    setTempSelectedPath(isLeaf ? finalPath : []);
    setColumns(newColumns);
  };

  const [pendingCategory, setPendingCategory] = useState<DropdownCategory | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const commitSelection = (category: DropdownCategory) => {
    applyPathSelection(category);
    addToRecent(category);
    onSelect?.(category);
    resetDropdownState();
  };

  const requestCategorySelection = (category: DropdownCategory) => {
    if (selectedCategory && selectedCategory.id !== category.id && isDirty) {
      setPendingCategory(category);
      setIsConfirmModalOpen(true);
    } else {
      commitSelection(category);
    }
  };

  const handleConfirmModalProceed = () => {
    if (pendingCategory) {
      commitSelection(pendingCategory);
      setPendingCategory(null);
    }
    setIsConfirmModalOpen(false);
  };

  const handleConfirmModalCancel = () => {
    setPendingCategory(null);
    setIsConfirmModalOpen(false);
  };

  const handleGlobalResultSelect = (category: DropdownCategory) => {
    applyPathSelection(category);
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
  };

  const handleRecentSelect = (recent: RecentCategory) => {
    const recentLevel = Array.isArray(recent.path)
      ? recent.path.length - 1
      : String(recent.path).split('/').length - 1;
    const item: DropdownCategory = {
      id: recent.id,
      name: recent.name,
      parentCategory: null,
      hasChildren: false,
      level: recentLevel,
      path: recent.path,
    };

    if (isOpen) {
      // When dropdown is open, extend all path columns and highlight hierarchy
      applyPathSelection(item);
    } else {
      requestCategorySelection(item);
    }
  };

  const handleConfirm = () => {
    if (tempSelectedPath.length > 0) {
      const finalCategory = tempSelectedPath[tempSelectedPath.length - 1];
      if (!finalCategory.hasChildren) {
        requestCategorySelection(finalCategory);
      }
    }
  };

  const resetDropdownState = () => {
    setIsOpen(false);
    setColumns([{ parentId: null, parentName: 'Categories', searchQuery: '' }]);
    setSelectedPath([]);
    setTempSelectedPath([]);
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
  };

  useEffect(() => {
    if (!selectedCategory) {
      resetDropdownState();
    }
  }, [selectedCategory]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && selectedCategory) {
      applyPathSelection(selectedCategory);
    }
  };

  const getCategoriesForColumn = (column: ColumnData): DropdownCategory[] => {
    if (column.searchQuery) {
      return searchCategories(column.searchQuery, column.parentId || undefined);
    }
    return column.parentId ? getChildCategories(column.parentId) : getRootCategories();
  };

  const currentSelectionText =
    tempSelectedPath.length > 0 ? tempSelectedPath.map((cat) => cat.name).join(' > ') : '';

  // Auto-scroll columns to reveal current selection path
  useEffect(() => {
    const path = selectedPath.length > 0 ? selectedPath : tempSelectedPath;
    if (!path.length) return;
    requestAnimationFrame(() => {
      path.forEach((cat, i) => {
        const key = `${i}:${cat.id}`;
        itemRefs.current[key]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      });
    });
  }, [columns, selectedPath, tempSelectedPath]);

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-testid="category-cascading-trigger"
            className="w-full justify-between text-left h-10 px-3"
            onClick={() => setIsOpen(!isOpen)}
          >
            {selectedCategory ? (
              <span className="truncate">{formatCategoryPath(selectedCategory.path)}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>

        {/* Recently used outside the dropdown (Image 2) */}
        {recentCategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-muted-foreground font-normal">Recently used:</span>
            <div className="flex flex-wrap gap-1.5">
              {recentCategories.slice(0, 5).map((recent) => (
                <Button
                  key={recent.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-auto rounded-full px-2.5 py-0.5 text-xs font-normal border border-border"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecentSelect(recent);
                  }}
                >
                  {recent.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <PopoverContent
          className="p-0 w-[min(800px,95vw)] bg-background border shadow-xl z-50 max-h-[var(--radix-popover-content-available-height)] overflow-hidden"
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
        >
          <div className="p-3 sm:p-4 space-y-3 max-h-[var(--radix-popover-content-available-height)] overflow-hidden flex flex-col">
            {/* Global search */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories globally..."
                value={globalSearchQuery}
                onChange={(e) => handleGlobalSearchChange(e.target.value)}
                className="pl-10 h-9 text-xs sm:text-sm"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Spinner size="default" />
                </div>
              )}
            </div>

            {/* Global search results */}
            {globalSearchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto flex-shrink-0">
                <div className="p-2 bg-muted/30 border-b text-sm font-medium">Search Results</div>
                <div className="p-1">
                  {globalSearchResults.map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-8 px-2 text-xs font-normal"
                      onClick={() => handleGlobalResultSelect(category)}
                    >
                      <span className="truncate">{formatCategoryPath(category.path)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Recently used inside modal */}
            {recentCategories.length > 0 && !globalSearchQuery && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground flex-shrink-0">
                <span className="font-medium text-foreground">Recently used:</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentCategories.slice(0, 5).map((recent) => (
                    <Button
                      key={recent.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-auto rounded-full px-2.5 py-0.5 text-xs font-normal border border-border"
                      onClick={() => handleRecentSelect(recent)}
                    >
                      {recent.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Category columns */}
            {!globalSearchQuery && (
              <div className="border rounded-lg overflow-hidden flex-1 min-h-0">
                <div className="overflow-x-auto">
                  <div className="flex h-56 w-max min-w-full">
                    {columns.map((column, columnIndex) => {
                      const categoriesForColumn = getCategoriesForColumn(column);
                      return (
                        <div
                          key={columnIndex}
                          className="w-56 sm:w-64 shrink-0 border-r border-border last:border-r-0 flex flex-col"
                        >
                          <div className="p-2 border-b border-border bg-muted/30 flex-shrink-0">
                            <div className="relative">
                              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                              <Input
                                placeholder="Filter..."
                                value={column.searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value, columnIndex)}
                                className="pl-7 h-7 text-xs"
                              />
                            </div>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="p-1">
                              {categoriesForColumn.map((category) => (
                                <Button
                                  key={category.id}
                                  variant="ghost"
                                  className={cn(
                                    'w-full justify-between text-left h-8 px-2 text-xs font-normal',
                                    selectedPath.some((cat) => cat.id === category.id) &&
                                      'bg-accent',
                                    tempSelectedPath.some((cat) => cat.id === category.id) &&
                                      'bg-primary/10 text-primary font-semibold',
                                  )}
                                  ref={(el) => {
                                    const key = `${columnIndex}:${category.id}`;
                                    if (el) itemRefs.current[key] = el;
                                    else delete itemRefs.current[key];
                                  }}
                                  onClick={() => handleCategoryClick(category, columnIndex)}
                                >
                                  <span className="whitespace-nowrap overflow-x-auto block max-w-full">
                                    {category.name}
                                  </span>
                                  {category.hasChildren && (
                                    <ChevronRight className="h-3 w-3 shrink-0 ml-1" />
                                  )}
                                </Button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Current selection */}
            {currentSelectionText && (
              <div className="p-2.5 bg-muted/50 rounded-lg border flex-shrink-0">
                <div className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Current selection: </span>
                  <span className="font-semibold text-primary">{currentSelectionText}</span>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-border pt-2.5 flex-shrink-0 bg-background">
              <span className="text-xs text-muted-foreground">
                {tempSelectedPath.length > 0 &&
                !tempSelectedPath[tempSelectedPath.length - 1].hasChildren
                  ? 'Ready to confirm selection'
                  : 'Select a final subcategory'}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDropdownState} size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  size="sm"
                  data-testid="category-confirm-btn"
                  disabled={
                    tempSelectedPath.length === 0 ||
                    (tempSelectedPath.length > 0 &&
                      tempSelectedPath[tempSelectedPath.length - 1].hasChildren)
                  }
                >
                  Confirm Selection
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Warning Confirmation Modal when Changing Category on a Dirty Form */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Change Category?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              You have already entered product details for this category. Switching to a new category
              will regenerate the form schema and may reset category-specific dynamic fields.
              <br />
              <br />
              Are you sure you want to change to{' '}
              <span className="font-semibold text-foreground">
                {pendingCategory?.name || 'the new category'}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConfirmModalCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmModalProceed}
            >
              Change Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
