/**
 * Loading state component for category page
 */

import React from 'react';

import { Spinner } from '@celebs/shared-ui/components/spinner';

export const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Spinner size="xl" className="text-primary" />
      <p className="text-sm text-muted-foreground">Loading categories...</p>
    </div>
  );
};
