import { useEffect, useRef } from 'react';
import { ChevronRight, Search } from 'lucide-react';

import type { DropdownCategory } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { ScrollArea } from '@celebs/shared-ui/components/scroll-area';

import type { DropdownColumn } from '../../types';

import { cn } from '@/lib/utils';

interface CategoryColumnsProps {
  columns: DropdownColumn[];
  getCategoriesForColumn: (column: DropdownColumn) => DropdownCategory[];
  selectedPath: DropdownCategory[];
  tempSelectedPath: DropdownCategory[];
  onCategoryClick: (category: DropdownCategory, columnIndex: number) => void;
  onColumnSearch: (value: string, columnIndex: number) => void;
}

export function CategoryColumns({
  columns,
  getCategoriesForColumn,
  selectedPath,
  tempSelectedPath,
  onCategoryClick,
  onColumnSearch,
}: CategoryColumnsProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Auto-scroll columns to reveal the current selection path.
  useEffect(() => {
    const path = selectedPath.length > 0 ? selectedPath : tempSelectedPath;
    if (path.length === 0) return;
    const frame = requestAnimationFrame(() => {
      path.forEach((cat, i) => {
        itemRefs.current[`${i}:${cat.id}`]?.scrollIntoView({ block: 'nearest' });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [columns, selectedPath, tempSelectedPath]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <div className="flex h-56 w-max min-w-full">
          {columns.map((column, columnIndex) => (
            <div
              key={`${column.parentId ?? 'root'}-${columnIndex}`}
              className="flex w-56 shrink-0 flex-col border-r border-border last:border-r-0 sm:w-64"
            >
              <div className="shrink-0 border-b border-border bg-muted/50 p-2">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Filter..."
                    aria-label={`Filter ${column.parentName}`}
                    value={column.searchQuery}
                    onChange={(e) => onColumnSearch(e.target.value, columnIndex)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1">
                  {getCategoriesForColumn(column).map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-between px-2',
                        selectedPath.some((cat) => cat.id === category.id) && 'bg-accent',
                        tempSelectedPath.some((cat) => cat.id === category.id) &&
                          'bg-accent font-medium text-accent-foreground',
                      )}
                      ref={(el) => {
                        const key = `${columnIndex}:${category.id}`;
                        if (el) itemRefs.current[key] = el;
                        else delete itemRefs.current[key];
                      }}
                      onClick={() => onCategoryClick(category, columnIndex)}
                    >
                      <span className="block max-w-full truncate">{category.name}</span>
                      {category.hasChildren && (
                        <ChevronRight aria-hidden="true" className="ml-1 h-3 w-3 shrink-0" />
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
