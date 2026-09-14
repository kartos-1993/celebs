import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import type { DropdownCategory } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';

import { formatCategoryPath } from '../../utils/category-dropdown-helpers';

interface CategoryTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selectedCategory?: DropdownCategory | null;
  placeholder: string;
}

/** Ref-forwarding trigger so Radix PopoverTrigger asChild can attach to it. */
export const CategoryTrigger = React.forwardRef<HTMLButtonElement, CategoryTriggerProps>(
  ({ selectedCategory, placeholder, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        data-testid="category-cascading-trigger"
        className="h-10 w-full justify-between px-3 text-left"
        {...props}
      >
        {selectedCategory ? (
          <span className="truncate">{formatCategoryPath(selectedCategory.path)}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
    );
  },
);
CategoryTrigger.displayName = 'CategoryTrigger';
