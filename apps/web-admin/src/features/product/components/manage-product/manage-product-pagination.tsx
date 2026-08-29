import React from 'react';

import { Button } from '@celebs/shared-ui/components/button';

interface ManageProductPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ManageProductPagination: React.FC<ManageProductPaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <Button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        variant="outline"
        size="sm"
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        variant="outline"
        size="sm"
      >
        Next
      </Button>
    </div>
  );
};
