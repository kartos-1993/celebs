import React, { memo } from 'react';

import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { Dialog, DialogContent } from '@celebs/shared-ui/components/dialog';
import { Tabs } from '@celebs/shared-ui/components/tabs';

import { MediaPickerFooter } from './media-picker/media-picker-footer';
import { MediaPickerHeader } from './media-picker/media-picker-header';
import { MediaPickerLibraryTab } from './media-picker/media-picker-library-tab';
import { type MediaPickerTab, MediaPickerTabBar } from './media-picker/media-picker-tab-bar';
import { MediaPickerUploadTab } from './media-picker/media-picker-upload-tab';
import { useMediaPickerState } from './media-picker/use-media-picker-state';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[], assets?: MediaAsset[]) => void;
  maxSelect?: number;
  initialSelectedUrls?: string[];
  scope?: MediaScope;
}

/**
 * LAYOUT ONLY. Every piece of state and every handler lives in
 * `useMediaPickerState`; the tab strip is `MediaPickerTabBar`. This file used to
 * be 189 lines, over AGENTS §4's 150-line budget, and a new patch here would
 * have made it worse — so the behaviour was moved, not appended (§11).
 *
 * `memo` is kept: the dialog is mounted permanently by every
 * `MediaLibraryButton` call site and only rendered when open, so a re-render
 * must not churn it.
 */
export const MediaPickerDialog = memo(function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  maxSelect = 8,
  initialSelectedUrls = [],
  scope = 'PRODUCT',
}: MediaPickerDialogProps) {
  const picker = useMediaPickerState({
    open,
    onOpenChange,
    onSelect,
    maxSelect,
    initialSelectedUrls,
    scope,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <MediaPickerHeader
          quotaPct={picker.quotaPct}
          selectedCount={picker.selectedUrls.length}
          maxSelect={maxSelect}
        />
        <Tabs
          value={picker.activeTab}
          onValueChange={(val) => picker.setActiveTab(val as MediaPickerTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <MediaPickerTabBar
            activeTab={picker.activeTab}
            selectedCount={picker.selectedUrls.length}
            maxSelect={maxSelect}
          />
          <MediaPickerLibraryTab
            searchTerm={picker.searchTerm}
            onSearchChange={picker.setSearchTerm}
            isLoading={picker.isLoadingAssets}
            assets={picker.assets}
            selectedUrls={picker.selectedUrls}
            maxSelect={maxSelect}
            onToggleSelect={picker.toggleSelectAsset}
            onGoToUpload={() => picker.setActiveTab('upload')}
          />
          <MediaPickerUploadTab
            isUploading={picker.isUploading}
            uploadError={picker.uploadError}
            onDrop={picker.handleDrop}
            onDragOver={picker.handleDragOver}
            onFilesSelected={picker.handleDirectFilesUpload}
          />
        </Tabs>
        <MediaPickerFooter
          selectedCount={picker.selectedUrls.length}
          onCancel={picker.handleCancel}
          onConfirm={picker.handleConfirmSelection}
        />
      </DialogContent>
    </Dialog>
  );
});
