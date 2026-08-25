import React, { memo, useCallback, useState } from 'react';

import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';

import { MediaPickerDialog } from './media-picker-dialog';

import { cn } from '@/lib/utils';

interface MediaLibraryButtonProps {
  label?: string;
  maxSelect?: number;
  initialSelectedUrls?: string[];
  scope?: MediaScope;
  disabled?: boolean;
  className?: string;
  onSelect: (urls: string[], assets?: MediaAsset[]) => void;
}

/**
 * Compact blue text-link trigger + MediaPickerDialog pair. Reusable anywhere
 * a field needs to pick existing assets from the media library (main
 * image, color swatch, color gallery, ...).
 */
export const MediaLibraryButton = memo(function MediaLibraryButton({
  label = 'Upload from media',
  maxSelect = 1,
  initialSelectedUrls,
  scope = 'PRODUCT',
  disabled,
  className,
  onSelect,
}: MediaLibraryButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (urls: string[], assets?: MediaAsset[]) => {
      if (urls.length > 0) onSelect(urls, assets);
    },
    [onSelect],
  );

  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={`Pick ${maxSelect === 1 ? 'an image' : 'images'} from media library`}
        className={cn(
          'h-auto px-0.5 py-0.5 text-xs font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline',
          className,
        )}
      >
        {label}
      </Button>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        maxSelect={maxSelect}
        initialSelectedUrls={initialSelectedUrls}
        scope={scope}
      />
    </>
  );
});
