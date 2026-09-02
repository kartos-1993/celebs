import { Check, Image as ImageIcon, Search } from 'lucide-react';

import type { MediaAsset } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { TabsContent } from '@celebs/shared-ui/components/tabs';

import { cn } from '@/lib/utils';

interface Props {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  isLoading: boolean;
  assets: MediaAsset[];
  selectedUrls: string[];
  maxSelect: number;
  onToggleSelect: (asset: MediaAsset) => void;
  onGoToUpload: () => void;
}

export function MediaPickerLibraryTab({
  searchTerm,
  onSearchChange,
  isLoading,
  assets,
  selectedUrls,
  maxSelect,
  onToggleSelect,
  onGoToUpload,
}: Props) {
  return (
    <TabsContent value="library" className="m-0 flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 p-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid shrink-0 grid-cols-3 gap-3 p-3 pt-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <ImageIcon className="mb-2 h-10 w-10 stroke-1 opacity-40" />
            <p className="text-sm font-medium">No media found</p>
            <p className="mt-0.5 text-xs">Try another search or upload new images.</p>
            <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={onGoToUpload}>
              Upload Image
            </Button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
            <div className="grid auto-rows-max grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {assets.map((asset) => {
                const isSelected = selectedUrls.includes(asset.url);
                const isCapped = !isSelected && selectedUrls.length >= maxSelect;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    title={asset.originalName}
                    aria-pressed={isSelected}
                    disabled={isCapped}
                    onClick={() => onToggleSelect(asset)}
                    className={cn(
                      'group relative block aspect-square w-full overflow-hidden rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-primary ring-2 ring-primary ring-offset-1'
                        : 'border-border/60 hover:border-foreground/40',
                      isCapped ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                    )}
                  >
                    <img
                      src={asset.url}
                      alt={asset.originalName}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div
                      className={cn(
                        'absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-medium text-white',
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      )}
                    >
                      {asset.originalName}
                    </div>
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                    {(asset.usageCount ?? 0) > 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 py-px font-mono text-[10px] leading-4 text-white">
                        {asset.usageCount}x
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  );
}
