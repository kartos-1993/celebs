import React, { type ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { FormLabel } from '@celebs/shared-ui/components/form';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useAuthContext } from '@/context/auth-provider';

export interface CategoryImageFieldProps {
  imageUrl?: string | null;
  isUploading: boolean;
  onClear: () => void;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const CategoryImageField: React.FC<CategoryImageFieldProps> = ({
  imageUrl,
  isUploading,
  onClear,
  onUpload,
}) => {
  const { isSuperAdmin } = useAuthContext();

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-2 border-t pt-4">
      <FormLabel>Category Image (Superadmin Only)</FormLabel>
      <div className="flex items-center space-x-4">
        {imageUrl ? (
          <div className="relative w-16 h-16 rounded-md border overflow-hidden group">
            <img src={imageUrl} alt="Category image" className="w-full h-full object-cover" />
            <Button
              type="button"
              onClick={onClear}
              className="absolute inset-0 bg-black bg-opacity-50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            {isUploading ? (
              <Spinner size="sm" className="text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Upload</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={onUpload}
            />
          </label>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Category thumbnail image for storefront navigation.</p>
          <p>Upload square image (JPEG, PNG, WebP, AVIF) up to 5MB.</p>
        </div>
      </div>
    </div>
  );
};
