import React from 'react';
import { UploadCloud } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import { TabsContent } from '@celebs/shared-ui/components/tabs';

interface Props {
  isUploading: boolean;
  uploadError: string | null;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onFilesSelected: (files: FileList | File[]) => void;
}

export function MediaPickerUploadTab({
  isUploading,
  uploadError,
  onDrop,
  onDragOver,
  onFilesSelected,
}: Props) {
  return (
    <TabsContent
      value="upload"
      className="m-0 flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6"
    >
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 bg-card/50 p-8 text-center transition-colors hover:border-primary"
      >
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          {isUploading ? <Spinner size="xl" /> : <UploadCloud className="h-8 w-8" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Drag &amp; drop images here</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Supports JPEG, PNG, WebP, AVIF up to 10MB each
          </p>
        </div>

        {uploadError && <p className="text-xs font-medium text-destructive">{uploadError}</p>}

        <label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={isUploading}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onFilesSelected(e.target.files);
            }}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isUploading}
            className="pointer-events-none cursor-pointer"
          >
            {isUploading ? 'Uploading...' : 'Browse Files'}
          </Button>
        </label>
      </div>
    </TabsContent>
  );
}
