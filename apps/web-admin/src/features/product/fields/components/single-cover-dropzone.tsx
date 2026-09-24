import React from 'react';
import { RefreshCw, UploadCloud, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaLibraryButton } from '../../components/media-library-button';

interface SingleCoverDropzoneProps {
  preview?: string;
  isUploading: boolean;
  onReplaceFile: (idx: number, f: File | null) => void;
  onRemoveFile: (idx: number) => void;
  onAddFiles: (
    e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] | null } },
  ) => void;
  handlePickerSelect: (urls: string[]) => void;
  fileInputs: React.MutableRefObject<Array<HTMLInputElement | null>>;
}

export function SingleCoverDropzone({
  preview,
  isUploading,
  onReplaceFile,
  onRemoveFile,
  onAddFiles,
  handlePickerSelect,
  fileInputs,
}: SingleCoverDropzoneProps) {
  return (
    <div className="space-y-2">
      {preview ? (
        <div className="group relative w-full h-44 rounded-xl border bg-muted/20 overflow-hidden">
          <img
            src={preview}
            alt="Product Main Preview"
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => fileInputs.current[0]?.click()}
              disabled={isUploading}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => onRemoveFile(0)}
              disabled={isUploading}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputs.current[0]?.click()}
            disabled={isUploading}
            className="h-auto w-full flex-row items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 hover:bg-muted/30 px-4 py-3 text-center cursor-pointer border-muted-foreground/30 hover:border-primary/50"
          >
            {isUploading ? (
              <>
                <Spinner size="sm" className="text-primary" />
                <span className="text-xs font-semibold text-primary">Uploading…</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                <span className="text-sm font-medium text-foreground">Click to upload</span>
                <span className="text-xs text-muted-foreground">· PNG, JPG or WEBP</span>
              </>
            )}
          </Button>
          {!isUploading && (
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              Already have assets?
              <MediaLibraryButton
                maxSelect={1}
                scope="PRODUCT"
                initialSelectedUrls={preview ? [preview] : []}
                onSelect={handlePickerSelect}
              />
            </p>
          )}
        </>
      )}
      <input
        ref={(el) => {
          fileInputs.current[0] = el;
        }}
        type="file"
        data-testid="main-image-upload-input"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          e.target.value = '';
          if (preview) onReplaceFile(0, f);
          else if (f) onAddFiles({ target: { files: [f] } });
        }}
      />
    </div>
  );
}
