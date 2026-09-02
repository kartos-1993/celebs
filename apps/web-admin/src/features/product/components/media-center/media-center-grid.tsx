import { Copy, ExternalLink, Image as ImageIcon, Trash2 } from 'lucide-react';

import type { MediaAsset } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { formatBytes } from './format-bytes';

import { cn } from '@/lib/utils';

interface Props {
  assets: MediaAsset[];
  isLoading: boolean;
  debouncedSearch: string;
  unusedOnly: boolean;
  onPreview: (a: MediaAsset) => void;
  onCopy: (url: string) => void;
  onDelete: (a: MediaAsset) => void;
  isDeleting: (id?: string) => boolean;
}

export function MediaCenterGrid({
  assets,
  isLoading,
  debouncedSearch,
  unusedOnly,
  onPreview,
  onCopy,
  onDelete,
  isDeleting,
}: Props) {
  const showSkeleton = isLoading && assets.length === 0;
  if (showSkeleton) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border/50">
            <div className="aspect-square animate-pulse bg-muted/40" />
            <div className="space-y-1.5 p-2.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="text-sm font-semibold text-foreground">Nothing here yet</h3>
        <p className="max-w-xs text-xs text-muted-foreground">
          {debouncedSearch || unusedOnly
            ? 'No product assets match the current filters.'
            : 'Upload product images to fill your catalog library.'}
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {assets.map((asset) => {
        const deleting = isDeleting(asset.id);
        return (
          <div
            key={asset.id}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-sm',
              deleting && 'opacity-50',
            )}
          >
            <div
              className="relative aspect-square w-full cursor-pointer overflow-hidden bg-muted/20"
              onClick={() => onPreview(asset)}
            >
              <img
                src={asset.url}
                alt={asset.originalName}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-md"
                  title="Copy CDN URL"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(asset.url);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-md"
                  title="Open in new tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(asset.url, '_blank');
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
              {typeof asset.usageCount === 'number' && asset.usageCount > 0 ? (
                <Badge className="absolute bottom-2 left-2 bg-black/80 font-mono text-xs text-white">
                  {asset.usageCount}× used
                </Badge>
              ) : asset.usageCount === 0 ? (
                <Badge
                  variant="outline"
                  className="absolute bottom-2 left-2 border-warning/40 bg-warning/10 text-xs text-warning"
                >
                  Unlinked
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-1 border-t border-border/40 p-2.5">
              <div className="flex min-w-0 flex-col truncate">
                <span
                  className="truncate text-xs font-medium text-foreground"
                  title={asset.originalName}
                >
                  {asset.originalName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatBytes(asset.sizeBytes ?? 0)} • Product
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(asset)}
                disabled={(asset.usageCount ?? 0) > 0 || deleting}
                title={
                  (asset.usageCount ?? 0) > 0 ? 'Cannot delete: actively linked' : 'Delete asset'
                }
              >
                {deleting ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
