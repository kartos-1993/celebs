import React from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { ImageValue, imageValueKey } from './shared';

interface MultiImageGridProps {
  previews: string[];
  files: ImageValue[];
  maxItems: number;
  isUploading: boolean;
  onReplaceFile: (idx: number, f: File | null) => void;
  onRemoveFile: (idx: number) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputs: React.MutableRefObject<Array<HTMLInputElement | null>>;
}

export function MultiImageGrid({
  previews,
  files,
  maxItems,
  isUploading,
  onReplaceFile,
  onRemoveFile,
  onAddFiles,
  fileInputs,
}: MultiImageGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {previews.map((src, idx) => (
        <div
          key={imageValueKey(files[idx] ?? src)}
          className="group relative h-28 rounded-xl border bg-muted/20 overflow-hidden"
        >
          <img src={src} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => fileInputs.current[idx]?.click()}
              disabled={isUploading}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRemoveFile(idx)}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <input
            ref={(el) => {
              fileInputs.current[idx] = el;
            }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              e.target.value = '';
              onReplaceFile(idx, f);
            }}
          />
        </div>
      ))}

      {previews.length < maxItems && (
        <label className="h-28 rounded-xl border border-dashed bg-muted/10 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center cursor-pointer border-muted-foreground/30 hover:border-primary/50 text-center p-2">
          {isUploading ? (
            <Spinner size="lg" className="text-primary" />
          ) : (
            <>
              <Plus className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-xs font-semibold text-foreground">Add Image</span>
            </>
          )}
          <input
            type="file"
            data-testid="main-image-upload-input"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onAddFiles}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}
