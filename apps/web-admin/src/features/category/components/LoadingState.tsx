/**
 * Loading state component for category page
 */

import React from 'react';
import { Loader } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading categories...</p>
    </div>
  );
};
