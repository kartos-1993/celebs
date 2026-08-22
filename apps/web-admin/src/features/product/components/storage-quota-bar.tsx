import React, { memo, useMemo } from 'react';
import { HardDrive, Info } from 'lucide-react';

import type { MediaQuota } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Progress } from '@celebs/shared-ui/components/progress';

import { computeStorageQuotaStats } from '../utils/storage-quota-utils';

interface StorageQuotaBarProps {
  quota?: MediaQuota | null;
  isLoading?: boolean;
}

export const StorageQuotaBar = memo(function StorageQuotaBar({
  quota,
  isLoading,
}: StorageQuotaBarProps) {
  const {
    usedFormatted,
    maxFormatted,
    percentage,
    isHighUsage,
    tierLabel,
    totalCount,
    unlinkedCount,
    unlinkedFormatted,
  } = useMemo(() => computeStorageQuotaStats(quota), [quota]);

  if (isLoading) {
    return (
      <div className="h-14 w-full animate-pulse rounded-xl border border-border/40 bg-card/60 p-3" />
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm transition-all sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HardDrive className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Storage Space (Cloudflare R2 DAM)
            </span>
            <Badge variant="outline" className="text-xs font-normal">
              {tierLabel}
            </Badge>
          </div>
          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-base font-bold text-foreground">{usedFormatted}</span>
            <span className="text-xs text-muted-foreground">/ {maxFormatted}</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              ({percentage}% used)
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 sm:w-64">
        <Progress
          value={percentage}
          className={`h-2.5 w-full bg-secondary/80 ${
            isHighUsage ? '[&>div]:bg-warning' : '[&>div]:bg-primary'
          }`}
        />
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>{totalCount} total assets</span>
          {unlinkedCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-warning">
              <Info className="h-3 w-3" />
              {unlinkedCount} unlinked ({unlinkedFormatted})
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
