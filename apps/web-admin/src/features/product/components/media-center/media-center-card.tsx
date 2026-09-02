import { Check, Trash2 } from 'lucide-react';

import type { MediaAsset } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { formatBytes } from './format-bytes';
import { MediaCardMenu } from './media-card-menu';

import { cn } from '@/lib/utils';

interface Props {
  asset: MediaAsset;
  isSelected: boolean;
  isDeleting: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (a: MediaAsset) => void;
  onCopy: (url: string) => void;
  onDelete: (a: MediaAsset) => void;
  onEdit: (a: MediaAsset) => void;
}

export function MediaCenterCard({
  asset,
  isSelected,
  isDeleting,
  onToggleSelect,
  onPreview,
  onCopy,
  onDelete,
  onEdit,
}: Props) {
  const handleCardClick = () => {
    if (asset.id) {
      onToggleSelect(asset.id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-card shadow-xs transition-all select-none',
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-1'
          : 'border-border/60 hover:border-primary/40 hover:shadow-sm',
        isDeleting && 'opacity-50',
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted/20">
        <div
          className={cn(
            'absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-md border shadow transition-colors',
            isSelected
              ? 'border-primary bg-primary text-white'
              : 'border-white/80 bg-white/80 text-transparent group-hover:border-primary/60 group-hover:text-muted-foreground/40',
          )}
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </div>

        <img
          src={asset.url}
          alt={asset.originalName}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        <MediaCardMenu
          asset={asset}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopy={onCopy}
        />

        {typeof asset.usageCount === 'number' && asset.usageCount > 0 ? (
          <Badge className="absolute bottom-2 left-2 bg-black/80 font-mono text-xs text-white shadow-sm">
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
          <span className="truncate text-xs font-medium text-foreground" title={asset.originalName}>
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
          onClick={(e) => {
            e.stopPropagation();
            onDelete(asset);
          }}
          disabled={(asset.usageCount ?? 0) > 0 || isDeleting}
          title={(asset.usageCount ?? 0) > 0 ? 'Cannot delete: actively linked' : 'Delete asset'}
        >
          {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
