import React, { ChangeEvent } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Label } from '@celebs/shared-ui/components/label';

import { StorefrontShortcutItem } from '../types';

import { StorefrontShortcutItemCard } from './storefront-shortcut-item-card';

interface StorefrontShortcutItemsProps {
  items: StorefrontShortcutItem[];
  autoPopulate: boolean;
  uploadingIndex: number | null;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (
    index: number,
    field: keyof StorefrontShortcutItem,
    value: StorefrontShortcutItem[keyof StorefrontShortcutItem],
  ) => void;
  onFileUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
}

export const StorefrontShortcutItems: React.FC<StorefrontShortcutItemsProps> = ({
  items,
  autoPopulate,
  uploadingIndex,
  onAddItem,
  onRemoveItem,
  onItemChange,
  onFileUpload,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Custom / Overridden Shortcut Items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="flex items-center gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="p-4 text-center border-2 border-dashed rounded-lg text-xs text-muted-foreground bg-muted/50">
          {autoPopulate
            ? 'Auto-populate is active. Child category names & images will be dynamically fetched at runtime.'
            : 'No custom items added. Click "Add Item" to define custom shortcut items.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <StorefrontShortcutItemCard
              key={idx}
              item={item}
              index={idx}
              isUploading={uploadingIndex === idx}
              onRemove={onRemoveItem}
              onItemChange={onItemChange}
              onFileUpload={onFileUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
};
