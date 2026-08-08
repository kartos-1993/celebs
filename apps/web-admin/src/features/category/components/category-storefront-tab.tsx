import React, { useState, useEffect, ChangeEvent } from 'react';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Plus, Trash2, Save, Loader, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useQuickFilters } from '../hooks/use-quick-filters';
import { QuickFilter, QuickFilterItem, QuickFilterType, QuickFilterDisplayAs } from '../types';
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

  const handleSave = async () => {
    if (!categoryId) return;
    try {
      setStatusMessage(null);
      const isManual = items.length > 0;
      const payload: Partial<QuickFilter> = {
        id: currentFilterId,
        categoryId,
        type,
        displayAs,
        autoPopulate: isManual ? false : autoPopulate,
        items,
        isActive: true,
      };

      await saveQuickFilter(payload);
      setStatusMessage('Storefront display settings saved successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Failed to save: ${err?.message || String(err)}`);
    }
  };

  useEffect(() => {
    if (onRegisterSaveHandler) {
      onRegisterSaveHandler(handleSave);
    }
  }, [onRegisterSaveHandler, categoryId, currentFilterId, type, displayAs, autoPopulate, items]);

  if (!categoryId) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Please save the category basic info first before configuring storefront display settings.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-gray-500 gap-2">
        <Loader className="h-4 w-4 animate-spin text-fashion-500" />
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

  const handleItemChange = (index: number, field: keyof QuickFilterItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
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
      } catch (err: any) {
        setStatusMessage(`Image upload failed: ${err?.message || 'Upload error'}`);
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
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Quick Filter Configuration Section */}
      <div className="space-y-4 border p-4 rounded-lg bg-gray-50/50">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-fashion-600" />
          Hero Quick Filter Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Source Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Filter Data Source</Label>
            <Select value={type} onValueChange={(val) => setType(val as QuickFilterType)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select filter source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subcategory">Child Subcategories</SelectItem>
                <SelectItem value="attribute">Product Attribute (Color, Fit, etc.)</SelectItem>
                <SelectItem value="tag">Marketing Tags (Dashain, Japan Pack)</SelectItem>
                <SelectItem value="collection">Curated Collection</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-500">
              Determines where items for the hero filter bar are pulled from.
            </p>
          </div>

          {/* Display Style */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Display Component Style</Label>
            <Select value={displayAs} onValueChange={(val) => setDisplayAs(val as QuickFilterDisplayAs)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select display style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avatar_scroll">Circular Image Avatars</SelectItem>
                <SelectItem value="chip_list">Text Pill Chips</SelectItem>
                <SelectItem value="color_swatch">Color Swatches</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-500">
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
          <Label htmlFor="autoPopulate" className="text-xs font-medium text-gray-700 cursor-pointer">
            Auto-populate items from child categories (uses each child category's thumbnail image)
          </Label>
        </div>
      </div>

      {/* Custom Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-800">
            Custom / Overridden Filter Items
          </Label>
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
          <div className="p-4 text-center border-2 border-dashed rounded-lg text-xs text-gray-400 bg-gray-50">
            {autoPopulate
              ? 'Auto-populate is active. Child category names & images will be dynamically fetched at runtime.'
              : 'No custom items added. Click "Add Item" to define custom filter cards.'}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-3 border rounded-lg bg-white shadow-sm"
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
                    className="text-red-500 hover:bg-red-50 h-9 w-9 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Avatar Image Picker: Dual File Upload + Text URL */}
                <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                  <Label className="text-xs text-gray-600 font-medium shrink-0">Avatar Image:</Label>

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
                    <label className="h-9 px-3 rounded border border-dashed border-gray-300 flex items-center gap-1.5 cursor-pointer hover:border-fashion-500 transition-colors bg-gray-50 shrink-0">
                      {uploadingIndex === idx ? (
                        <Loader className="h-3.5 w-3.5 animate-spin text-fashion-600" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-600 font-medium">
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
          className="bg-fashion-600 hover:bg-fashion-700 text-white flex items-center gap-2"
        >
          {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Storefront Display Configuration
        </Button>
      </div>
    </div>
  );
};

export default CategoryStorefrontTab;
