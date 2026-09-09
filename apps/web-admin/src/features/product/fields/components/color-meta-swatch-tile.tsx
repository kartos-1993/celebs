import React from 'react';

import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaLibraryButton } from '../../components/media-library-button';

export interface ColorMetaSwatchTileProps {
  color: string;
  swatchUrl: string | null;
  isUploading: boolean;
  acceptStr?: string;
  onSelectFile: (file: File | null) => void;
  onSelectLibrary: (urls: string[]) => void;
}

export const ColorMetaSwatchTile: React.FC<ColorMetaSwatchTileProps> = ({
  color,
  swatchUrl,
  isUploading,
  acceptStr,
  onSelectFile,
  onSelectLibrary,
}) => {
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative block h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-accent/20 transition-colors hover:border-primary/50"
        title={swatchUrl ? 'Replace swatch image' : 'Upload swatch image'}
      >
        <input
          type="file"
          data-testid={`color-swatch-upload-${color}`}
          className="hidden"
          accept={acceptStr}
          disabled={isUploading}
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            e.target.value = '';
            onSelectFile(f);
          }}
        />
        {swatchUrl ? (
          <img src={swatchUrl} alt={`${color} swatch`} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Swatch
          </span>
        )}
        {isUploading ? (
          <span className="absolute inset-0 grid place-items-center bg-black/60">
            <Spinner size="sm" className="text-white" />
          </span>
        ) : null}
      </label>
      {!swatchUrl ? (
        <MediaLibraryButton
          label="Set swatch"
          maxSelect={1}
          scope="PRODUCT"
          initialSelectedUrls={[]}
          disabled={isUploading}
          onSelect={onSelectLibrary}
        />
      ) : null}
    </div>
  );
};
