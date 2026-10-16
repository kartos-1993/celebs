import React from 'react';
import { Save } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useStorefrontShortcutForm } from '../hooks/use-storefront-shortcut-form';

import { StorefrontHeroConfig } from './storefront-hero-config';
import { StorefrontShortcutItems } from './storefront-shortcut-items';

interface CategoryStorefrontTabProps {
  categoryId?: string;
  onRegisterSaveHandler?: (handler: () => Promise<void>) => void;
}

export const CategoryStorefrontTab: React.FC<CategoryStorefrontTabProps> = ({
  categoryId,
  onRegisterSaveHandler,
}) => {
  const {
    type,
    setType,
    displayAs,
    setDisplayAs,
    autoPopulate,
    setAutoPopulate,
    items,
    statusMessage,
    uploadingIndex,
    isLoading,
    isSaving,
    handleAddItem,
    handleRemoveItem,
    handleItemChange,
    handleFileUpload,
    handleSave,
  } = useStorefrontShortcutForm(categoryId, onRegisterSaveHandler);

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

  const isErrorStatus =
    statusMessage?.includes('Failed') || statusMessage?.includes('failed') || false;

  return (
    <div className="space-y-6 pt-2">
      {statusMessage && (
        <div
          className={`p-3 rounded-md text-sm font-medium ${
            isErrorStatus
              ? 'bg-destructive/10 text-destructive border border-destructive/30'
              : 'bg-success/10 text-success border border-success/30'
          }`}
        >
          {statusMessage}
        </div>
      )}

      <StorefrontHeroConfig
        type={type}
        onTypeChange={setType}
        displayAs={displayAs}
        onDisplayAsChange={setDisplayAs}
        autoPopulate={autoPopulate}
        onAutoPopulateChange={setAutoPopulate}
      />

      <StorefrontShortcutItems
        items={items}
        autoPopulate={autoPopulate}
        uploadingIndex={uploadingIndex}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onItemChange={handleItemChange}
        onFileUpload={handleFileUpload}
      />

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
