import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import { StorefrontShortcutDisplayAs, StorefrontShortcutType } from '../types';

interface StorefrontHeroConfigProps {
  type: StorefrontShortcutType;
  onTypeChange: (type: StorefrontShortcutType) => void;
  displayAs: StorefrontShortcutDisplayAs;
  onDisplayAsChange: (displayAs: StorefrontShortcutDisplayAs) => void;
  autoPopulate: boolean;
  onAutoPopulateChange: (autoPopulate: boolean) => void;
}

export const StorefrontHeroConfig: React.FC<StorefrontHeroConfigProps> = ({
  type,
  onTypeChange,
  displayAs,
  onDisplayAsChange,
  autoPopulate,
  onAutoPopulateChange,
}) => {
  return (
    <div className="space-y-4 border p-4 rounded-lg bg-muted/50">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ImageIcon className="h-4 w-4 text-primary" />
        Hero Storefront Shortcut
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data Source Type */}
        <div className="space-y-2">
          <Label>Shortcut Data Source</Label>
          <Select value={type} onValueChange={(val) => onTypeChange(val as StorefrontShortcutType)}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select shortcut source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subcategory">Child Subcategories</SelectItem>
              <SelectItem value="attribute">Product Attribute (Color, Fit, etc.)</SelectItem>
              <SelectItem value="campaign">Active Campaign (Dashain, Tihar, ...)</SelectItem>
              <SelectItem value="collection">Curated Collection</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Determines where items for the hero shortcut bar are pulled from.
          </p>
        </div>

        {/* Display Style */}
        <div className="space-y-2">
          <Label>Display Component Style</Label>
          <Select
            value={displayAs}
            onValueChange={(val) => onDisplayAsChange(val as StorefrontShortcutDisplayAs)}
          >
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select display style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="avatar_scroll">Circular Image Avatars</SelectItem>
              <SelectItem value="chip_list">Text Pill Chips</SelectItem>
              <SelectItem value="color_swatch">Color Swatches</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Determines how the shortcut renders on the mobile application.
          </p>
        </div>
      </div>

      {/* Auto Populate Option */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="autoPopulate"
          checked={autoPopulate}
          onCheckedChange={(checked) => onAutoPopulateChange(!!checked)}
        />
        <Label htmlFor="autoPopulate" className="cursor-pointer">
          Auto-populate items from child categories (uses each child category's thumbnail image)
        </Label>
      </div>
    </div>
  );
};
