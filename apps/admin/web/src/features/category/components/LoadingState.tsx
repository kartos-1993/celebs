/**
 * Loading state component for category page
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-fashion-700" />
      <p className="text-sm text-muted-foreground">Loading categories...</p>
    </div>
  );
};
