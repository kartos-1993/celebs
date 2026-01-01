import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Search, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useCategories } from '../hooks/useCategories';
import { CategoryApiService } from '../../category/api';
import { cn } from '../../../lib/utils';

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  hasChildren: boolean;
  level: number;
  path: string[];
}

export interface CategoryNode extends Category {
  children?: CategoryNode[];
}

export interface RecentCategory {
  id: string;
  name: string;
  path: string[];
  usedAt: Date;
}

interface ColumnData {
  parentId: string | null;
  parentName: string;
  searchQuery: string;
}

interface CascadingDropdownProps {
  onSelect?: (category: Category) => void;
  placeholder?: string;
  selectedCategory?: Category | null;
  onSearch?: (query: string) => Promise<Category[]>;
}

export const CascadingDropdown: React.FC<CascadingDropdownProps> = ({
  onSelect,
  placeholder = "Please select category or search with keyword",
  selectedCategory,
  onSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnData[]>([
    { parentId: null, parentName: 'Categories', searchQuery: '' }
  ]);
  const [selectedPath, setSelectedPath] = useState<Category[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [tempSelectedPath, setTempSelectedPath] = useState<Category[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<Category[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { getRootCategories, getChildCategories, searchCategories, recentCategories, addToRecent, findCategoryById } = useCategories();

  // Helper: collect all leaf descendants for a given parent id
  const collectLeafDescendants = (parentId: string): Category[] => {
    const result: Category[] = [];
    const children = getChildCategories(parentId);
    const dfs = (node: Category) => {
      const kids = getChildCategories(node.id);
      if (!kids || kids.length === 0) {
        result.push(node);
      } else {
        for (const k of kids) dfs(k);
      }
    };
    for (const ch of children) dfs(ch);
    return result;
  };

  // Helper: resolve a category to local tree by its path segments
  const resolveLocalByPath = (segments: string[] | undefined | null): Category | undefined => {
    if (!segments || segments.length === 0) return undefined;
    let parentId: string | null = null;
    let last: Category | undefined = undefined;
    for (const name of segments) {
      const candidates: Category[] = parentId ? getChildCategories(parentId) : getRootCategories();
      const match: Category | undefined = candidates.find((c: Category) => c.name === name);
      if (!match) return undefined;
      last = match;
      parentId = match.id;
    }
    return last;
  };

  const handleCategoryClick = (category: Category, columnIndex: number) => {
    if (category.hasChildren) {
      expandToCategory(category, columnIndex);
      return;
    }
    // Select leaf category
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(category);
    setTempSelectedPath(newPath);
  };

  const expandToCategory = (category: Category, columnIndex: number) => {
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(category);
    setSelectedPath(newPath);
  // Clear any previous leaf selection when navigating non-leaf levels
  setTempSelectedPath([]);

    // Only add a new column if the category has children AND there are actual child categories
    if (category.hasChildren) {
      const newColumns = columns.slice(0, columnIndex + 1);
      // Always add a next column to reflect hierarchy, even if data not yet present
      newColumns.push({
        parentId: category.id,
        parentName: category.name,
        searchQuery: ''
      });
      setColumns(newColumns);
    }
  };

  const handleSearchChange = (value: string, columnIndex: number) => {
    const newColumns = [...columns];
    newColumns[columnIndex].searchQuery = value;
    setColumns(newColumns);
  };

  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearchQuery(value);
    // clear pending
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
    const q = value;
    debounceRef.current = window.setTimeout(async () => {
      try {
        let results: Category[] = [];
        if (onSearch) {
          results = await onSearch(q);
        } else {
          const apiResults = await CategoryApiService.searchCategories(q);
          results = apiResults.map((c: { id: string; name: string; parentId?: string | null; hasChildren?: boolean; level?: number; path?: string[] }) => ({
            id: c.id,
            name: c.name,
            parentId: c.parentId ?? null,
            hasChildren: !!c.hasChildren,
            level: c.level ?? (Array.isArray(c.path) ? c.path.length - 1 : 0),
            path: Array.isArray(c.path) ? c.path : [c.name],
          }));
        }
        // Expand any matched parent categories into their leaf descendants using local tree
        const expandedLeaves: Category[] = [];
        for (const r of results) {
          let local: Category | undefined = r.id ? findCategoryById?.(r.id) : undefined;
          if (!local) {
            local = resolveLocalByPath(r.path);
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
        // Dedupe by id
        const deduped = Array.from(
          new Map(expandedLeaves.map((c) => [c.id, c])).values(),
        );
        setGlobalSearchResults(deduped);
      } catch (_error) {
        // Log error using a proper logging mechanism or handle it appropriately
        // Example: send error to monitoring service or display user-friendly message
        setGlobalSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleRecentSelect = (category: Category) => {
    applyPathSelection(category);
  };

  // Build and apply columns/paths from a category.path
  const applyPathSelection = (category: Category) => {
    // First try to resolve by ID (most reliable)
    const byId = category.id ? findCategoryById?.(category.id) : undefined;
    let finalPath: Category[] = [];

    if (byId) {
      // Walk up via parentId to construct full path
      const chain: Category[] = [];
      let node: Category | undefined = byId;
      while (node) {
        chain.unshift(node);
        node = node.parentId ? findCategoryById?.(node.parentId) : undefined;
      }
      finalPath = chain;
    } else {
      // Fallback to resolving each segment by name from our local cache
      if (!category.path || category.path.length === 0) {
        setTempSelectedPath([category]);
        return;
      }
      const resolvedPath: Category[] = [];
      for (let i = 0; i < category.path.length; i++) {
        const name = category.path[i];
        const parentId = i === 0 ? null : resolvedPath[i - 1]?.id ?? null;
        const candidates = parentId === null ? getRootCategories() : getChildCategories(parentId!);
        const match = candidates.find((c) => c.name === name);
        if (!match) {
          break;
        }
        resolvedPath.push(match);
      }
      finalPath = resolvedPath.length > 0 ? resolvedPath : [category];
    }

    // Build columns so that each selected level opens the next column
    const newColumns: ColumnData[] = [{ parentId: null, parentName: 'Categories', searchQuery: '' }];
    // For each resolved level, add a column showing its children list.
    // Do not add an extra empty column after a leaf node without children.
    for (let i = 0; i < finalPath.length; i++) {
      const node = finalPath[i];
      const isLast = i === finalPath.length - 1;
      if (!isLast || node.hasChildren) {
        newColumns.push({ parentId: node.id, parentName: node.name, searchQuery: '' });
      }
    }

  setSelectedPath(finalPath);
  // Only treat as selectable if final node is a leaf
  const isLeaf = finalPath.length > 0 && !finalPath[finalPath.length - 1].hasChildren;
  setTempSelectedPath(isLeaf ? finalPath : []);
    setColumns(newColumns);
  };

  const handleGlobalResultSelect = (category: Category) => {
    applyPathSelection(category);
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
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

  const getCategoriesForColumn = (column: ColumnData): Category[] => {
    if (column.searchQuery) {
      return searchCategories(column.searchQuery, column.parentId || undefined);
    }
    return column.parentId ? getChildCategories(column.parentId) : getRootCategories();
  };

  const currentSelectionText = tempSelectedPath.length > 0 
    ? tempSelectedPath.map(cat => cat.name).join(' > ')
    : '';

  // Auto-scroll columns to reveal current selection path
  useEffect(() => {
    const path = selectedPath.length > 0 ? selectedPath : tempSelectedPath;
    if (!path.length) return;
    // Wait for DOM to paint after column updates
    requestAnimationFrame(() => {
      path.forEach((cat, i) => {
        const key = `${i}:${cat.id}`;
        const el = itemRefs.current[key];
  el?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      });
    });
  }, [columns, selectedPath, tempSelectedPath]);

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left h-10 px-3"
            onClick={() => setIsOpen(!isOpen)}
          >
            {selectedCategory ? (
              <span className="truncate">{selectedCategory.path.join(' > ')}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="p-0 w-[800px] bg-background border shadow-lg z-50"
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
        >
          <div className="p-4 space-y-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Global Search at Top */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories globally..."
                value={globalSearchQuery}
                onChange={(e) => handleGlobalSearchChange(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Global Search Results */}
            {globalSearchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                <div className="p-2 bg-muted/30 border-b text-sm font-medium">Search Results</div>
                <div className="p-1">
                  {globalSearchResults.map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-8 px-2 text-xs font-normal"
                      onClick={() => handleGlobalResultSelect(category)}
                    >
                      <span className="truncate">{category.path.join(' > ')}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Used Section */}
            {recentCategories.length > 0 && !globalSearchQuery && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Recently used: {' '}
                  {recentCategories.slice(0, 2).map((recent, index) => (
                    <Button
                      key={recent.id}
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-blue-600 hover:text-blue-800"
                      onClick={() => handleRecentSelect({
                        id: recent.id,
                        name: recent.name,
                        parentId: null,
                        hasChildren: false,
                        level: recent.path.length - 1,
                        path: recent.path
                      })}
                    >
                      {recent.name}
                      {index < Math.min(recentCategories.length, 2) - 1 && <span className="ml-2">•</span>}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Columns - only show if not searching globally */}
            {!globalSearchQuery && (
              <div className="border rounded-lg overflow-hidden flex-1 min-h-0">
                <div className="overflow-x-auto">
                  <div className="flex h-64 w-max min-w-full">
                  {columns.map((column, columnIndex) => {
                    const categoriesForColumn = getCategoriesForColumn(column);
                    
                    return (
                      <div key={columnIndex} className="w-64 shrink-0 border-r border-border last:border-r-0 min-w-64 flex flex-col">
                        {/* Column Header with Filter */}
                        <div className="p-3 border-b border-border bg-muted/30 flex-shrink-0">
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

                        {/* Categories List - Scrollable */}
                        <ScrollArea className="flex-1">
                          <div className="p-1">
                            {categoriesForColumn.map((category) => (
                              <Button
                                key={category.id}
                                variant="ghost"
                                className={cn(
                                  "w-full justify-between text-left h-8 px-2 text-xs font-normal",
                                  selectedPath.some(cat => cat.id === category.id) && "bg-accent",
                                  tempSelectedPath.some(cat => cat.id === category.id) && "bg-primary/10 text-primary"
                                )}
                                ref={(el) => {
                                  const k = `${columnIndex}:${category.id}`;
                                  if (el) itemRefs.current[k] = el;
                                  else delete itemRefs.current[k];
                                }}
                                onClick={() => handleCategoryClick(category, columnIndex)}
                              >
                                <span className="whitespace-nowrap overflow-x-auto block max-w-full">{category.name}</span>
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

            {/* Current Selection */}
            {currentSelectionText && (
              <div className="p-3 bg-muted/50 rounded border flex-shrink-0">
                <div className="text-sm">
                  <span className="text-muted-foreground">Current selection: </span>
                  <span className="font-medium text-primary">{currentSelectionText}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
              <Button variant="outline" onClick={resetDropdownState} size="sm">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                size="sm"
                disabled={
                  tempSelectedPath.length === 0 ||
                  (tempSelectedPath.length > 0 && tempSelectedPath[tempSelectedPath.length - 1].hasChildren)
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
