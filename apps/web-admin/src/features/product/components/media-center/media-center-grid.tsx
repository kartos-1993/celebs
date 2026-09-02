import { Image as ImageIcon } from 'lucide-react';

import type { MediaAsset } from '@celebs/shared-types';

import { MediaCenterCard } from './media-center-card';

interface Props {
  assets: MediaAsset[];
  isLoading: boolean;
  debouncedSearch: string;
  unusedOnly: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (a: MediaAsset) => void;
  onCopy: (url: string) => void;
  onDelete: (a: MediaAsset) => void;
  onEdit: (a: MediaAsset) => void;
  isDeleting: (id?: string) => boolean;
}

export function MediaCenterGrid({
  assets,
  isLoading,
  debouncedSearch,
  unusedOnly,
  selectedIds,
  onToggleSelect,
  onPreview,
  onCopy,
  onDelete,
  onEdit,
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
      {assets.map((asset) => (
        <MediaCenterCard
          key={asset.id}
          asset={asset}
          isSelected={selectedIds.has(asset.id || '')}
          isDeleting={isDeleting(asset.id)}
          onToggleSelect={onToggleSelect}
          onPreview={onPreview}
          onCopy={onCopy}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
