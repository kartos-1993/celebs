import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2, Upload, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useQuickFilters } from '../hooks/use-quick-filters';
import { QuickFilter, QuickFilterDisplayAs, QuickFilterItem, QuickFilterType } from '../types';

import { uploadFiles } from '@/features/product/api';

interface CategoryStorefrontTabProps {
  categoryId?: string;
  onRegisterSaveHandler?: (handler: () => Promise<void>) => void;
}

export const CategoryStorefrontTab: React.FC<CategoryStorefrontTabProps> = ({
  categoryId,
  onRegisterSaveHandler,
}) => {
  const { quickFilters, isLoading, saveQuickFilter, isSaving } = useQuickFilters(categoryId);

  const [type, setType] = useState<QuickFilterType>('subcategory');
  const [displayAs, setDisplayAs] = useState<QuickFilterDisplayAs>('avatar_scroll');
  const [autoPopulate, setAutoPopulate] = useState<boolean>(true);
  const [items, setItems] = useState<QuickFilterItem[]>([]);
  const [currentFilterId, setCurrentFilterId] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (quickFilters && quickFilters.length > 0) {
      const qf = quickFilters[0];
      setCurrentFilterId(qf.id);
      setType(qf.type || 'subcategory');
      setDisplayAs(qf.displayAs || 'avatar_scroll');
      setAutoPopulate(qf.autoPopulate !== false);
      setItems(qf.items || []);
    } else {
      setCurrentFilterId(undefined);
      setType('subcategory');
      setDisplayAs('avatar_scroll');
      setAutoPopulate(true);
      setItems([]);
    }
  }, [quickFilters]);

  const handleSave = useCallback(async () => {
    if (!categoryId) return;
    try {
      const payload: Partial<QuickFilter> & { name?: string } = {
        id: currentFilterId,
        categoryId,
        name: `${type} filters`,
        type,
        displayAs,
        autoPopulate,
        items,
        isActive: true,
      };

      await saveQuickFilter(payload);
      setStatusMessage('Storefront display settings saved successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setStatusMessage(`Failed to save: ${errObj?.message || String(err)}`);
    }
  }, [categoryId, currentFilterId, type, displayAs, autoPopulate, items, saveQuickFilter]);

  useEffect(() => {
    if (onRegisterSaveHandler) {
      onRegisterSaveHandler(handleSave);
    }
  }, [onRegisterSaveHandler, handleSave]);

  if (!categoryId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Please save the category basic info first before configuring storefront display settings.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground gap-2">
        <Spinner size="sm" className="text-primary" />
        Loading storefront display settings...
      </div>
    );
  }

  const handleAddItem = () => {
    setAutoPopulate(false);
    setItems((prev) => [
      ...prev,
      {
        name: '',
        image: '',
        filterValue: '',
        slug: '',
        displayOrder: prev.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof QuickFilterItem,
    value: QuickFilterItem[keyof QuickFilterItem],
  ) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleFileUpload = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        setUploadingIndex(index);
        const file = e.target.files[0];
        const urls = await uploadFiles([file]);
        if (urls && urls.length > 0) {
          handleItemChange(index, 'image', urls[0]);
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        setStatusMessage(`Image upload failed: ${errObj?.message || 'Upload error'}`);
      } finally {
        setUploadingIndex(null);
      }
    }
  };

  // handleSave is defined above and registered with parent form hook

  return (
    <div className="space-y-6 pt-2">
      {statusMessage && (
        <div
          className={`p-3 rounded-md text-sm font-medium ${
            statusMessage.includes('Failed') || statusMessage.includes('failed')
              ? 'bg-destructive/10 text-destructive border border-destructive/30'
              : 'bg-success/10 text-success border border-success/30'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Quick Filter Configuration Section */}
      <div className="space-y-4 border p-4 rounded-lg bg-muted/50">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Hero Quick Filter Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Source Type */}
          <div className="space-y-2">
            <Label>Filter Data Source</Label>
            <Select value={type} onValueChange={(val) => setType(val as QuickFilterType)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select filter source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subcategory">Child Subcategories</SelectItem>
                <SelectItem value="attribute">Product Attribute (Color, Fit, etc.)</SelectItem>
                <SelectItem value="tag">Marketing Tags (Dashain, Japan Pack)</SelectItem>
                <SelectItem value="collection">Curated Collection</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines where items for the hero filter bar are pulled from.
            </p>
          </div>

          {/* Display Style */}
          <div className="space-y-2">
            <Label>Display Component Style</Label>
            <Select
              value={displayAs}
              onValueChange={(val) => setDisplayAs(val as QuickFilterDisplayAs)}
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
              Determines how the quick filter renders on the mobile application.
            </p>
          </div>
        </div>

        {/* Auto Populate Option */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="autoPopulate"
            checked={autoPopulate}
            onCheckedChange={(checked) => setAutoPopulate(!!checked)}
          />
          <Label htmlFor="autoPopulate" className="cursor-pointer">
            Auto-populate items from child categories (uses each child category's thumbnail image)
          </Label>
        </div>
      </div>

      {/* Custom Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Custom / Overridden Filter Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
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
              : 'No custom items added. Click "Add Item" to define custom filter cards.'}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-3 border rounded-lg bg-card shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      placeholder="Display Name (e.g. Light Wash / Baggy)"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="text-xs h-9"
                    />
                    <Input
                      placeholder="Filter Value / Slug (e.g. light-wash / baggy)"
                      value={item.filterValue || item.slug || ''}
                      onChange={(e) => {
                        handleItemChange(idx, 'filterValue', e.target.value);
                        handleItemChange(idx, 'slug', e.target.value);
                      }}
                      className="text-xs h-9"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(idx)}
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
                      <img
                        src={item.image}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        onClick={() => handleItemChange(idx, 'image', '')}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        size="icon"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="h-9 px-3 rounded border border-dashed border-border flex items-center gap-1.5 cursor-pointer hover:border-primary transition-colors bg-muted/50 shrink-0">
                      {uploadingIndex === idx ? (
                        <Spinner size="sm" className="text-primary" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground font-medium">
                        {uploadingIndex === idx ? 'Uploading...' : 'Upload Image File'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingIndex === idx}
                        onChange={(e) => handleFileUpload(idx, e)}
                      />
                    </label>
                  )}

                  {/* Or Manual URL Input */}
                  <Input
                    placeholder="Or paste image URL (https://...)"
                    value={item.image || ''}
                    onChange={(e) => handleItemChange(idx, 'image', e.target.value)}
                    className="text-xs h-9 flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || uploadingIndex !== null}
          className="flex items-center gap-2"
        >
          {isSaving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          Save Storefront Display Configuration
        </Button>
      </div>
    </div>
  );
};

export default CategoryStorefrontTab;
