import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, XCircle } from 'lucide-react';
import { logger } from '@celebs/shared-utils';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@celebs/shared-ui/components/popover';
import { ScrollArea } from '@celebs/shared-ui/components/scroll-area';
import { cn } from '@/lib/utils';
import { SharedCategoryApi } from '@/api/category';
import { useCategoryTree } from '../hooks/use-category-tree';
import type { DropdownCategory, RecentCategory } from '../types';

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
}

export const CascadingDropdown: React.FC<CascadingDropdownProps> = ({
  onSelect,
  placeholder = 'Please select category or search with keyword',
  selectedCategory,
  onSearch,
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
          const apiResults = await SharedCategoryApi.searchCategories(query);
          results = apiResults.map(
            (c: {
              id: string;
              name: string;
              parentId?: string | null;
              hasChildren?: boolean;
              level?: number;
              path?: string[] | string;
            }) => ({
              id: c.id,
              name: c.name,
              parentId: c.parentId ?? null,
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
      // Walk up via parentId to construct full path
      const chain: DropdownCategory[] = [];
      let node: DropdownCategory | undefined = byId;
      while (node) {
        chain.unshift(node);
        node = node.parentId ? findCategoryById?.(node.parentId) : undefined;
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
      parentId: null,
      hasChildren: false,
      level: recentLevel,
      path: recent.path,
    };
    applyPathSelection(item);
    addToRecent(item);
    onSelect?.(item);
    resetDropdownState();
  };

  const handleConfirm = () => {
    if (tempSelectedPath.length > 0) {
      const finalCategory = tempSelectedPath[tempSelectedPath.length - 1];
      if (!finalCategory.hasChildren) {
        addToRecent(finalCategory);
        onSelect?.(finalCategory);
      }
    }
    resetDropdownState();
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
    <div className="space-y-1.5">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-testid="category-cascading-trigger"
            className="w-full justify-between text-left h-10 px-3 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50/50"
            onClick={() => setIsOpen(!isOpen)}
          >
            {selectedCategory ? (
              <span className="truncate text-gray-900 dark:text-gray-100 font-normal">
                {formatCategoryPath(selectedCategory.path)}
              </span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 font-normal">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
          </Button>
        </PopoverTrigger>

        {/* Recently used outside the dropdown (Image 2) */}
        {recentCategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-normal">Recently used:</span>
            <div className="flex flex-wrap gap-1.5">
              {recentCategories.slice(0, 4).map((recent) => (
                <button
                  key={recent.id}
                  type="button"
                  className="inline-flex items-center rounded-full bg-blue-50/70 hover:bg-blue-100/90 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 px-3 py-0.5 text-xs font-normal border border-blue-100/60 dark:border-gray-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecentSelect(recent);
                  }}
                >
                  {recent.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <PopoverContent
          className="p-0 w-[min(900px,96vw)] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 max-h-[var(--radix-popover-content-available-height)] overflow-hidden"
          align="start"
          side="bottom"
          sideOffset={6}
          avoidCollisions={true}
        >
          <div className="p-4 space-y-3.5 max-h-[var(--radix-popover-content-available-height)] overflow-hidden flex flex-col">
            {/* Top Search Category Bar (Image 1) */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search category"
                value={globalSearchQuery}
                onChange={(e) => handleGlobalSearchChange(e.target.value)}
                className="pl-10 h-10 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Global Search Results */}
            {globalSearchResults.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg max-h-48 overflow-y-auto flex-shrink-0 bg-white dark:bg-gray-900">
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-b text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Search Results
                </div>
                <div className="p-1">
                  {globalSearchResults.map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-8 px-2 text-xs font-normal hover:bg-orange-50 hover:text-orange-900"
                      onClick={() => handleGlobalResultSelect(category)}
                    >
                      <span className="truncate">{formatCategoryPath(category.path)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Used inside Popover (Image 1) */}
            {recentCategories.length > 0 && !globalSearchQuery && (
              <div className="flex items-center gap-2 flex-wrap text-xs flex-shrink-0">
                <span className="text-gray-500 dark:text-gray-400 font-normal">Recently used:</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentCategories.slice(0, 6).map((recent) => (
                    <button
                      key={recent.id}
                      type="button"
                      className="inline-flex items-center rounded-full bg-blue-50/70 hover:bg-blue-100/90 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 px-3 py-0.5 text-xs font-normal border border-blue-100/60 dark:border-gray-700 transition-colors"
                      onClick={() => handleRecentSelect(recent)}
                    >
                      {recent.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cascading Multi-Column Panels (Image 1) */}
            {!globalSearchQuery && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex-1 min-h-0 bg-white dark:bg-gray-950">
                <div className="overflow-x-auto">
                  <div className="flex h-64 w-max min-w-full">
                    {columns.map((column, columnIndex) => {
                      const categoriesForColumn = getCategoriesForColumn(column);
                      return (
                        <div
                          key={columnIndex}
                          className="w-52 sm:w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col bg-white dark:bg-gray-950"
                        >
                          {/* Column Filter Input (Image 1) */}
                          <div className="p-2 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-950 flex-shrink-0">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              <Input
                                placeholder="Filter..."
                                value={column.searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value, columnIndex)}
                                className="pl-7 h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-gray-400"
                              />
                            </div>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="p-1 space-y-0.5">
                              {categoriesForColumn.map((category) => {
                                const isAncestorSelected = selectedPath.some(
                                  (cat) => cat.id === category.id,
                                );
                                const isLeafSelected = tempSelectedPath.some(
                                  (cat) => cat.id === category.id,
                                );
                                return (
                                  <Button
                                    key={category.id}
                                    variant="ghost"
                                    className={cn(
                                      'w-full justify-between text-left h-8 px-2.5 text-xs font-normal rounded-md transition-colors',
                                      isAncestorSelected &&
                                        'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                                      isLeafSelected &&
                                        'bg-blue-50/80 dark:bg-blue-950/50 text-gray-900 dark:text-gray-100 font-medium',
                                    )}
                                    ref={(el) => {
                                      const key = `${columnIndex}:${category.id}`;
                                      if (el) itemRefs.current[key] = el;
                                      else delete itemRefs.current[key];
                                    }}
                                    onClick={() => handleCategoryClick(category, columnIndex)}
                                  >
                                    <div className="flex items-center truncate min-w-0 pr-1">
                                      {isLeafSelected && (
                                        <Check className="h-3.5 w-3.5 text-orange-500 shrink-0 mr-1.5" />
                                      )}
                                      <span className="truncate">{category.name}</span>
                                    </div>
                                    {category.hasChildren && (
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 ml-1" />
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Bar: Current selection & Action Buttons (Image 1) */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 flex-shrink-0">
              {currentSelectionText ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Current selection :</span>
                  <span className="text-orange-500 dark:text-orange-400 font-normal">
                    {currentSelectionText}
                  </span>
                  <button
                    type="button"
                    className="text-orange-500 hover:text-orange-600 transition-colors ml-0.5 inline-flex items-center"
                    onClick={() => {
                      setTempSelectedPath([]);
                    }}
                  >
                    <XCircle className="h-4 w-4 fill-orange-500 text-white" />
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetDropdownState}
                  className="h-8 px-4 text-xs font-normal border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-testid="category-confirm-btn"
                  disabled={
                    tempSelectedPath.length === 0 ||
                    (tempSelectedPath.length > 0 &&
                      tempSelectedPath[tempSelectedPath.length - 1].hasChildren)
                  }
                  onClick={handleConfirm}
                  className="h-8 px-5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white border-0 rounded-md disabled:opacity-50"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
