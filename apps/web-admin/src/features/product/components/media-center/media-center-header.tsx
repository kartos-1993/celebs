import { UploadCloud } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface Props {
  isUploading: boolean;
  onUpload: (files: FileList | File[]) => void;
}

export function MediaCenterHeader({ isUploading, onUpload }: Props) {
  return (
    <PageHeader
      title="Media Center"
      description="Product media library — powered by Cloudflare R2. WebP-optimized."
      actions={
        <label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={isUploading}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onUpload(e.target.files);
            }}
          />
          <Button size="sm" disabled={isUploading} className="pointer-events-none cursor-pointer">
            {isUploading ? (
              <>
                <Spinner size="sm" className="mr-1.5" /> Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="mr-1.5 h-4 w-4" /> Upload
              </>
            )}
          </Button>
        </label>
      }
    />
  );
}
