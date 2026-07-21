/**
 * Empty state component for when no categories exist
 */

import React from 'react';
import { Button } from '@celebs/shared-ui/components/button';
import { FolderPlus } from 'lucide-react';

interface EmptyStateProps {
  onAddCategory: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddCategory }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <p className="text-muted-foreground text-sm">No categories found</p>
      <Button
        onClick={onAddCategory}
      >
        <FolderPlus className="mr-2 h-4 w-4" />
        Add Your First Category
      </Button>
    </div>
  );
};

