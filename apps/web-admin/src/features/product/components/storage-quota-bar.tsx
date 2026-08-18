import React, { memo, useMemo } from 'react';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Progress } from '@celebs/shared-ui/components/progress';
import { HardDrive, Info } from 'lucide-react';
import type { MediaQuota } from '@celebs/shared-types';

interface StorageQuotaBarProps {
  quota?: MediaQuota | null;
  isLoading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const StorageQuotaBar = memo(function StorageQuotaBar({
  quota,
  isLoading,
}: StorageQuotaBarProps) {
  const { usedFormatted, maxFormatted, percentage, isHighUsage, tierLabel } = useMemo(() => {
    if (!quota) {
      return {
        usedFormatted: '0 MB',
        maxFormatted: '5 GB',
        percentage: 0,
        isHighUsage: false,
        tierLabel: 'Starter Store (5GB)',
      };
    }

    const usedFormatted = formatBytes(quota.usedBytes);
    const maxFormatted = formatBytes(quota.maxBytes);
    const percentage = Math.min(100, Math.round((quota.usedBytes / quota.maxBytes) * 100));
    const isHighUsage = percentage >= 80;
    const tierLabel =
      quota.tier === 'FLAGSHIP'
        ? 'Flagship Brand (100GB)'
        : quota.tier === 'MALL'
          ? 'Mall Verified (20GB)'
          : 'Starter Store (5GB)';

    return { usedFormatted, maxFormatted, percentage, isHighUsage, tierLabel };
  }, [quota]);

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
            <Badge variant="outline" className="text-[10px] font-normal">
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
            isHighUsage ? '[&>div]:bg-amber-500' : '[&>div]:bg-primary'
          }`}
        />
        <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
          <span>{quota?.totalAssetCount ?? 0} total assets</span>
          {quota && quota.unlinkedAssetCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <Info className="h-3 w-3" />
              {quota.unlinkedAssetCount} unlinked ({formatBytes(quota.unlinkedSizeBytes)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
