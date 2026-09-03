import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

import { Dialog, DialogContent } from '@celebs/shared-ui/components/dialog';

import {
  type CropTarget,
  type NaturalDimensions,
  type OffsetPosition,
  processCanvasCrop,
  resolveCleanCropSource,
} from './media-crop/crop-canvas';
import { MediaCropControls } from './media-crop/media-crop-controls';
import { MediaCropFooter } from './media-crop/media-crop-footer';
import { MediaCropHeader } from './media-crop/media-crop-header';
import { MediaCropViewport } from './media-crop/media-crop-viewport';

export interface MediaCropDialogProps {
  open: boolean;
  target?: CropTarget | null;
  file?: File | null;
  onCropComplete: (croppedFile: File, overwrite?: boolean) => void;
  onCancel: () => void;
  targetAspectRatio?: number; // default 0.75 (3:4)
}

export const MediaCropDialog = memo(function MediaCropDialog({
  open,
  target,
  file,
  onCropComplete,
  onCancel,
  targetAspectRatio = 3 / 4,
}: MediaCropDialogProps) {
  const resolvedTarget: CropTarget | null =
    target ?? (file ? { file, name: file.name, url: '' } : null);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [naturalDims, setNaturalDims] = useState<NaturalDimensions>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<OffsetPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<OffsetPosition>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!resolvedTarget) {
      setImgSrc(null);
      return;
    }
    const baseName = (resolvedTarget.name || 'image').replace(/\.[^/.]+$/, '').slice(0, 40);
    setEditedName(baseName);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCropError(null);

    let isMounted = true;
    let cleanupFn: (() => void) | null = null;

    resolveCleanCropSource(resolvedTarget).then((resolved) => {
      if (!isMounted) {
        resolved.cleanup();
        return;
      }
      cleanupFn = resolved.cleanup;
      setImgSrc(resolved.blobUrl);
      setNaturalDims({ width: resolved.naturalWidth, height: resolved.naturalHeight });
    });

    return () => {
      isMounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, [resolvedTarget]);

  const isLowRes = naturalDims.width > 0 && (naturalDims.width < 1200 || naturalDims.height < 1600);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart],
  );

  const handleApplyCrop = async (overwrite: boolean) => {
    if (!imgSrc || !resolvedTarget || !containerRef.current || !imageRef.current) return;
    setIsProcessing(true);
    setCropError(null);
    try {
      const cropped = await processCanvasCrop({
        imgSrc,
        container: containerRef.current,
        img: imageRef.current,
        naturalDims,
        targetAspectRatio,
        editedName,
        defaultFileName: resolvedTarget.name,
      });
      onCropComplete(cropped, overwrite);
    } catch (err) {
      setCropError(err instanceof Error ? err.message : 'Crop processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <MediaCropHeader editedName={editedName} onNameChange={setEditedName} />
        <div className="flex flex-col items-center gap-3 bg-muted/10 p-4">
          <MediaCropViewport
            containerRef={containerRef}
            imageRef={imageRef}
            imgSrc={imgSrc}
            zoom={zoom}
            offset={offset}
            isDragging={isDragging}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
          />
          <MediaCropControls
            zoom={zoom}
            onZoomChange={setZoom}
            onReset={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            isLowRes={isLowRes}
            naturalDims={naturalDims}
            cropError={cropError}
          />
        </div>

        <MediaCropFooter
          isEditingExisting={Boolean(resolvedTarget?.key)}
          isProcessing={isProcessing}
          onCancel={onCancel}
          onApplyCrop={handleApplyCrop}
        />
      </DialogContent>
    </Dialog>
  );
});
