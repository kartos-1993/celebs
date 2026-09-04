import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import { cn } from '@/lib/utils';

export interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Shared list pagination: rows-per-page left, `1 - 10 of 200` + numbered
 * pages with ellipsis right. Numbers use the app-wide numeral token
 * (`font-mono text-sm tabular-nums`) to match table cells.
 */
function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const end = Math.min(totalPages - 1, Math.max(2, Math.min(page - 1, totalPages - 3)) + 2);
  const start = Math.max(2, end - 2);
  if (start > 2) items.push('ellipsis-start');
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push('ellipsis-end');
  items.push(totalPages);
  return items;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}) => {
  const items = useMemo(() => pageItems(page, Math.max(totalPages, 1)), [page, totalPages]);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-7 w-[70px] rounded-full text-xs" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-2 font-mono text-sm tabular-nums text-muted-foreground">
          {start} - {end} of {total}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {items.map((item) =>
          typeof item === 'number' ? (
            <Button
              key={item}
              variant={item === page ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 w-7 p-0 font-mono text-sm tabular-nums',
                item === page && 'font-medium',
              )}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Button>
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="flex h-7 w-5 items-center justify-center text-xs text-muted-foreground"
            >
              …
            </span>
          ),
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
