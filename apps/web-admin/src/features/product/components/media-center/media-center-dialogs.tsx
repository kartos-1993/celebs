import { Copy } from 'lucide-react';

import type { MediaAsset, MediaQuota } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { ConfirmDialog } from '@celebs/shared-ui/components/confirm-dialog';
import { Dialog, DialogContent, DialogTitle } from '@celebs/shared-ui/components/dialog';

import { formatBytes } from './format-bytes';

type PendingConfirm = { kind: 'delete-asset'; asset: MediaAsset } | { kind: 'cleanup-unused' };

interface Props {
  previewAsset: MediaAsset | null;
  onPreviewChange: (v: MediaAsset | null) => void;
  onCopy: (url: string) => void;
  pendingConfirm: PendingConfirm | null;
  onConfirmChange: (v: PendingConfirm | null) => void;
  onConfirm: () => Promise<void>;
  quota?: MediaQuota | null;
}

export function MediaCenterDialogs({
  previewAsset,
  onPreviewChange,
  onCopy,
  pendingConfirm,
  onConfirmChange,
  onConfirm,
  quota,
}: Props) {
  return (
    <>
      <Dialog open={Boolean(previewAsset)} onOpenChange={() => onPreviewChange(null)}>
        <DialogContent className="max-w-3xl overflow-hidden border-0 bg-black/90 p-0">
          <DialogTitle className="sr-only">
            {previewAsset ? `Preview ${previewAsset.originalName}` : 'Media Preview'}
          </DialogTitle>
          {previewAsset && (
            <div className="flex flex-col">
              <div className="relative flex max-h-[75vh] items-center justify-center p-4">
                <img
                  src={previewAsset.url}
                  alt={previewAsset.originalName}
                  className="max-h-[70vh] w-auto rounded-lg object-contain shadow-2xl"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border bg-card p-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {previewAsset.originalName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(previewAsset.sizeBytes ?? 0)} • {previewAsset.mimeType} • Product
                  </p>
                </div>
                <Button size="sm" onClick={() => onCopy(previewAsset.url)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy CDN URL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) onConfirmChange(null);
        }}
        destructive
        confirmLabel={pendingConfirm?.kind === 'cleanup-unused' ? 'Clean up' : 'Delete'}
        title={
          pendingConfirm?.kind === 'delete-asset'
            ? `Delete "${pendingConfirm.asset.originalName}"?`
            : `Clean up ${quota?.unlinkedAssetCount ?? 0} unused assets?`
        }
        description={
          pendingConfirm?.kind === 'delete-asset'
            ? 'This permanently removes the file from cloud storage. This action cannot be undone.'
            : `${formatBytes(quota?.unlinkedSizeBytes ?? 0)} of unlinked files will be permanently deleted. This action cannot be undone.`
        }
        onConfirm={onConfirm}
      />
    </>
  );
}
