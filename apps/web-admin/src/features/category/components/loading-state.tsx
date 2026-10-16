/**
 * Loading state component for category page
 */

import React from 'react';

import { TableSkeleton } from '@/components/table-skeleton';

export const LoadingState: React.FC = () => {
  return <TableSkeleton rows={8} columns={4} className="rounded-none border-0 shadow-none" />;
};
