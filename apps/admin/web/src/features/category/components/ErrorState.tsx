/**
 * Error state component for category page
 */

import React from 'react';

interface ErrorStateProps {
  error: Error | null;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
        <p className="font-medium">Unable to load categories</p>
        <p className="mt-1 text-xs opacity-90">
          {error?.message ||
            'Please try again later or contact support if the issue persists.'}
        </p>
      </div>
    </div>
  );
};
