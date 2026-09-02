import type { MediaAsset } from '@celebs/shared-types';

import { toast } from '@/hooks/use-toast';

export function copyToClipboard(url: string): void {
  navigator.clipboard.writeText(url);
  toast({ title: 'Copied', description: 'CDN URL copied' });
}

export async function downloadMediaAsset(asset: MediaAsset): Promise<void> {
  try {
    const res = await fetch(asset.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.originalName || 'image.webp';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(asset.url, '_blank');
  }
}

export function exportMediaAssetCsv(asset: MediaAsset): void {
  const csv = `name,url\n"${asset.originalName}","${asset.url}"`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${asset.originalName?.replace(/\.[^/.]+$/, '') || 'asset'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
