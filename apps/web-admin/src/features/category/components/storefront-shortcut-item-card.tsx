import React, { ChangeEvent } from 'react';
import { Trash2, Upload, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { StorefrontShortcutItem } from '../types';

interface StorefrontShortcutItemCardProps {
  item: StorefrontShortcutItem;
  index: number;
  isUploading: boolean;
  onRemove: (index: number) => void;
  onItemChange: (
    index: number,
    field: keyof StorefrontShortcutItem,
    value: StorefrontShortcutItem[keyof StorefrontShortcutItem],
  ) => void;
  onFileUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
}

export const StorefrontShortcutItemCard: React.FC<StorefrontShortcutItemCardProps> = ({
  item,
  index,
  isUploading,
  onRemove,
  onItemChange,
  onFileUpload,
}) => {
  return (
    <div className="flex flex-col gap-3 p-3 border rounded-lg bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            placeholder="Display Name (e.g. Light Wash / Baggy)"
            value={item.name}
            onChange={(e) => onItemChange(index, 'name', e.target.value)}
            className="text-xs h-9"
          />
          <Input
            placeholder="Filter Value / Slug (e.g. light-wash / baggy)"
            value={item.filterValue || item.slug || ''}
            onChange={(e) => {
              onItemChange(index, 'filterValue', e.target.value);
              onItemChange(index, 'slug', e.target.value);
            }}
            className="text-xs h-9"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="text-destructive hover:bg-destructive/10 h-9 w-9 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Avatar Image Picker: Dual File Upload + Text URL */}
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <Label className="shrink-0">Avatar Image:</Label>

        {item.image ? (
          <div className="relative w-12 h-12 rounded border overflow-hidden group shrink-0">
            <img src={item.image} alt="Avatar preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              onClick={() => onItemChange(index, 'image', '')}
              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="h-9 px-3 rounded border border-dashed border-border flex items-center gap-1.5 cursor-pointer hover:border-primary transition-colors bg-muted/50 shrink-0">
            {isUploading ? (
              <Spinner size="sm" className="text-primary" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {isUploading ? 'Uploading...' : 'Upload Image File'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => onFileUpload(index, e)}
            />
          </label>
        )}

        {/* Or Manual URL Input */}
        <Input
          placeholder="Or paste image URL (https://...)"
          value={item.image || ''}
          onChange={(e) => onItemChange(index, 'image', e.target.value)}
          className="text-xs h-9 flex-1"
        />
      </div>
    </div>
  );
};
