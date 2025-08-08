import React, { useState, useRef } from 'react';
import { ChevronRight, Search, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useCategories } from '../hooks/useCategories';
import { CategoryApiService } from '../../category/api';
// import { Category } from '@/features/product/types/category';
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
  
  const { getRootCategories, getChildCategories, searchCategories, recentCategories, addToRecent } = useCategories();

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
    setTempSelectedPath(newPath);

    // Only add a new column if the category has children AND there are actual child categories
    if (category.hasChildren) {
      const childCategories = getChildCategories(category.id);
      if (childCategories.length > 0) {
        const newColumns = columns.slice(0, columnIndex + 1);
        newColumns.push({
          parentId: category.id,
          parentName: category.name,
          searchQuery: ''
        });
        setColumns(newColumns);
      }
    }
  };

  const handleSearchChange = (value: string, columnIndex: number) => {
    const newColumns = [...columns];
    newColumns[columnIndex].searchQuery = value;
    setColumns(newColumns);
  };

  const handleGlobalSearchChange = async (value: string) => {
    setGlobalSearchQuery(value);
    
    if (!value.trim()) {
      setGlobalSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: Category[] = [];
      
      if (onSearch) {
        results = await onSearch(value);
      } else {
        // Use backend search to include deep matches
        const api = await CategoryApiService.searchCategories(value);
        results = (api as any[]).map((c) => ({
          id: c.id || c._id || c.id,
          name: c.name,
          parentId: c.parentId ?? null,
          hasChildren: !!c.hasChildren,
          level: c.level ?? (Array.isArray(c.path) ? Math.max(0, c.path.length - 1) : 0),
          path: Array.isArray(c.path) && c.path.length ? c.path : [c.name],
        }));
      }
      
      setGlobalSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setGlobalSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecentSelect = (category: Category) => {
    // Build the full category path and expand columns accordingly
    const pathCategories: Category[] = [];
    const newColumns: ColumnData[] = [{ parentId: null, parentName: 'Categories', searchQuery: '' }];
    
    // Build categories from path
    for (let i = 0; i < category.path.length; i++) {
      const pathName = category.path[i];
      let categoryData: Category;
      
      if (i === 0) {
        // Root category
        categoryData = getRootCategories().find(cat => cat.name === pathName) || {
          id: `path-${i}`,
          name: pathName,
          parentId: null,
          hasChildren: i < category.path.length - 1,
          level: i,
          path: category.path.slice(0, i + 1)
        };
      } else {
        // Child category
        const parentId = pathCategories[i - 1].id;
        categoryData = getChildCategories(parentId).find(cat => cat.name === pathName) || {
          id: `path-${i}`,
          name: pathName,
          parentId: parentId,
          hasChildren: i < category.path.length - 1,
          level: i,
          path: category.path.slice(0, i + 1)
        };
      }
      
      pathCategories.push(categoryData);
      
      // Add column for next level if this category has children
      if (categoryData.hasChildren && i < category.path.length - 1) {
        newColumns.push({
          parentId: categoryData.id,
          parentName: categoryData.name,
          searchQuery: ''
        });
      }
    }
    
    setSelectedPath(pathCategories);
    setTempSelectedPath(pathCategories);
    setColumns(newColumns);
  };

  const handleGlobalResultSelect = (category: Category) => {
    setTempSelectedPath([category]);
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
  };

  const handleConfirm = () => {
    if (tempSelectedPath.length > 0) {
      const finalCategory = tempSelectedPath[tempSelectedPath.length - 1];
      addToRecent(finalCategory);
      onSelect?.(finalCategory);
    }
    setIsOpen(false);
    setColumns([{ parentId: null, parentName: 'Categories', searchQuery: '' }]);
    setSelectedPath([]);
    setTempSelectedPath([]);
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
  };

  const handleCancel = () => {
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
                <div className="flex h-[200px]">
                  {columns.map((column, columnIndex) => {
                    const categoriesForColumn = getCategoriesForColumn(column);
                    
                    return (
                      <div key={columnIndex} className="flex-1 border-r border-border last:border-r-0 min-w-0 flex flex-col">
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
                                onClick={() => handleCategoryClick(category, columnIndex)}
                              >
                                <span className="truncate">{category.name}</span>
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
            )}

            {/* Current Selection */}
            {currentSelectionText && (
              <div className="p-3 bg-muted/50 rounded border flex-shrink-0">
                <div className="text-sm">
                  <span className="text-muted-foreground">Current selection: </span>
                  <span className="font-medium text-orange-600">{currentSelectionText}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
              <Button variant="outline" onClick={handleCancel} size="sm">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                size="sm"
                disabled={tempSelectedPath.length === 0}
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
