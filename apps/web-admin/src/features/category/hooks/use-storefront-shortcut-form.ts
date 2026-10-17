import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import {
  StorefrontShortcut,
  StorefrontShortcutDisplayAs,
  StorefrontShortcutItem,
  StorefrontShortcutType,
} from '../types';

import { useStorefrontShortcuts } from './use-storefront-shortcuts';

import { uploadFiles } from '@/features/product/api';

export function useStorefrontShortcutForm(
  categoryId?: string,
  onRegisterSaveHandler?: (handler: () => Promise<void>) => void,
) {
  const { shortcuts, isLoading, saveShortcut, isSaving } = useStorefrontShortcuts(categoryId);

  const [type, setType] = useState<StorefrontShortcutType>('subcategory');
  const [displayAs, setDisplayAs] = useState<StorefrontShortcutDisplayAs>('avatar_scroll');
  const [autoPopulate, setAutoPopulate] = useState<boolean>(true);
  const [items, setItems] = useState<StorefrontShortcutItem[]>([]);
  const [currentShortcutId, setCurrentShortcutId] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (shortcuts && shortcuts.length > 0) {
      const shortcut = shortcuts[0];
      setCurrentShortcutId(shortcut.id);
      setType(shortcut.type || 'subcategory');
      setDisplayAs(shortcut.displayAs || 'avatar_scroll');
      setAutoPopulate(shortcut.autoPopulate !== false);
      setItems(shortcut.items || []);
    } else {
      setCurrentShortcutId(undefined);
      setType('subcategory');
      setDisplayAs('avatar_scroll');
      setAutoPopulate(true);
      setItems([]);
    }
  }, [shortcuts]);

  const handleSave = useCallback(async () => {
    if (!categoryId) return;
    try {
      const payload: Partial<StorefrontShortcut> & { name?: string } = {
        id: currentShortcutId,
        categoryId,
        name: `${type} shortcut`,
        type,
        displayAs,
        autoPopulate,
        items,
        isActive: true,
      };

      await saveShortcut(payload);
      setStatusMessage('Storefront display settings saved successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setStatusMessage(`Failed to save: ${errObj?.message || String(err)}`);
    }
  }, [categoryId, currentShortcutId, type, displayAs, autoPopulate, items, saveShortcut]);

  useEffect(() => {
    if (onRegisterSaveHandler) {
      onRegisterSaveHandler(handleSave);
    }
  }, [onRegisterSaveHandler, handleSave]);

  const handleAddItem = useCallback(() => {
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
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleItemChange = useCallback(
    (
      index: number,
      field: keyof StorefrontShortcutItem,
      value: StorefrontShortcutItem[keyof StorefrontShortcutItem],
    ) => {
      setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    },
    [],
  );

  const handleFileUpload = useCallback(
    async (index: number, e: ChangeEvent<HTMLInputElement>) => {
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
    },
    [handleItemChange],
  );

  return {
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
  };
}
