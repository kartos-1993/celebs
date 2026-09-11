import React from 'react';

import { Badge } from '@celebs/shared-ui/components/badge';

import type { ReviewStatus } from '../types';
import { getReviewStatusBadgeVariant } from '../utils/review-formatters';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const { label, className } = getReviewStatusBadgeVariant(status);

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
