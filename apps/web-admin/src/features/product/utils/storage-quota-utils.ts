import type { MediaQuota } from '@celebs/shared-types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function computeStorageQuotaStats(quota?: MediaQuota | null) {
  if (!quota) {
    return {
      usedFormatted: '0 MB',
      maxFormatted: '5 GB',
      percentage: 0,
      isHighUsage: false,
      tierLabel: 'Starter Store (5GB)',
      totalCount: 0,
      unlinkedCount: 0,
      unlinkedFormatted: '0 B',
    };
  }

  const usedFormatted = formatBytes(quota.usedBytes);
  const maxFormatted = formatBytes(quota.maxBytes);
  const percentage = Math.min(100, Math.round((quota.usedBytes / quota.maxBytes) * 100));
  const isHighUsage = percentage >= 80;

  const tierLabel =
    quota.tier === 'STRATEGIC_FLAGSHIP'
      ? 'Flagship Brand (100GB)'
      : quota.tier === 'VERIFIED_MALL'
        ? 'Mall Verified (20GB)'
        : 'Starter Store (5GB)';

  return {
    usedFormatted,
    maxFormatted,
    percentage,
    isHighUsage,
    tierLabel,
    totalCount: quota.totalAssetCount ?? 0,
    unlinkedCount: quota.unlinkedAssetCount ?? 0,
    unlinkedFormatted: formatBytes(quota.unlinkedSizeBytes ?? 0),
  };
}
