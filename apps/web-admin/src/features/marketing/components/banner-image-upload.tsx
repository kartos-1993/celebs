import React, { useRef, useState } from 'react';
import { ImagePlus, Link as LinkIcon, RefreshCw, Trash2 } from 'lucide-react';

import type { BannerImageUploadPropsType } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { uploadMarketingBanner } from '../api';

export function BannerImageUpload({
  value,
  onChange,
  label = 'Banner Image',
  aspectHint = 'Recommended ratio 16:9 or 21:9 (e.g. 1200x600px)',
}: BannerImageUploadPropsType) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadMarketingBanner(file);
      onChange(uploadedUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-info hover:text-info font-medium flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? 'Hide URL Input' : 'Paste Image URL directly'}
        </button>
      </div>

      {value ? (
        <div className="relative group rounded-xl border border-border overflow-hidden bg-muted/50 max-h-56">
          <img
            src={value}
            alt="Banner Preview"
            className="w-full h-48 object-cover rounded-xl"
            onError={() => setError('Image failed to load from URL')}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs bg-white/90 hover:bg-white text-foreground flex items-center gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Change Image
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="text-xs flex items-center gap-1.5"
              onClick={() => onChange('')}
              disabled={isUploading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-muted/50 hover:bg-muted ${
            isUploading ? 'opacity-50 pointer-events-none' : 'border-border hover:border-info'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-info">
              <Spinner size="lg" />
              <span className="text-xs font-medium">
                Uploading banner image to cloud storage...
              </span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-info/10 text-info rounded-full">
                <ImagePlus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground">
                  Click to upload banner image
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  PNG, JPG, WebP up to 5MB
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono mt-1">{aspectHint}</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />

      {showUrlInput && (
        <div className="pt-2">
          <Input
            placeholder="https://domain.com/banner-image.webp"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs h-9 font-mono"
          />
        </div>
      )}

      {error && <div className="text-xs text-destructive font-medium mt-1">{error}</div>}
    </div>
  );
}
