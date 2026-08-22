import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Crop, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';

interface MediaCropDialogProps {
  open: boolean;
  file: File | null;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  targetAspectRatio?: number; // default 0.75 (3:4)
}

export const MediaCropDialog = memo(function MediaCropDialog({
  open,
  file,
  onCropComplete,
  onCancel,
  targetAspectRatio = 3 / 4,
}: MediaCropDialogProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image preview and dimensions
  useEffect(() => {
    if (!file) {
      setImgSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImgSrc(objectUrl);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const isLowRes =
    naturalDims.width > 0 && (naturalDims.width < 1200 || naturalDims.height < 1600);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = async () => {
    if (!imgSrc || !file || !containerRef.current || !imageRef.current) return;

    setIsProcessing(true);
    try {
      const container = containerRef.current;
      const img = imageRef.current;

      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Output high-resolution canvas maintaining 3:4 aspect ratio
      const outputWidth = Math.max(1200, Math.min(naturalDims.width, 2400));
      const outputHeight = Math.round(outputWidth / targetAspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      // Calculate relative scale and crop offset
      const scaleX = naturalDims.width / imgRect.width;
      const scaleY = naturalDims.height / imgRect.height;

      const sourceX = (containerRect.left - imgRect.left) * scaleX;
      const sourceY = (containerRect.top - imgRect.top) * scaleY;
      const sourceWidth = containerRect.width * scaleX;
      const sourceHeight = containerRect.height * scaleY;

      const sourceImage = new Image();
      sourceImage.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        sourceImage.onload = () => resolve();
        sourceImage.onerror = reject;
        sourceImage.src = imgSrc;
      });

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        sourceImage,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(naturalDims.width, sourceWidth),
        Math.min(naturalDims.height, sourceHeight),
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.9);
      });

      if (!blob) {
        throw new Error('Failed to generate cropped WebP blob');
      }

      const croppedFileName = file.name.replace(/\.[^/.]+$/, '') + '-3x4.webp';
      const croppedFile = new File([blob], croppedFileName, { type: 'image/webp' });

      onCropComplete(croppedFile);
    } catch (err) {
      setCropError(err instanceof Error ? err.message : 'Crop processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crop className="h-4 w-4 text-primary" />
              <DialogTitle className="text-base font-bold">
                Standard 3:4 Fashion Crop
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              3:4 Portrait (0.75)
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Drag to reposition and adjust zoom to fit the apparel standard framing.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 flex flex-col items-center gap-3 bg-muted/10">
          {/* Crop Container with locked 3:4 Aspect Ratio */}
          <div
            ref={containerRef}
            className="relative w-64 aspect-[3/4] rounded-lg overflow-hidden border-2 border-primary/60 shadow-inner bg-black cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {imgSrc && (
              <img
                ref={imageRef}
                src={imgSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="max-w-none w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Rule of Thirds Grid Overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-white/15" />
              <div className="border-r border-white/15" />
              <div />
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-3 w-full max-w-xs justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-32 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={handleReset}
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Low Resolution Warning */}
          {isLowRes && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs w-full">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Original is {naturalDims.width}x{naturalDims.height}px. High-res zoom may look
                soft. (Recommended 1200x1600px+).
              </span>
            </div>
          )}

          {/* Crop Error */}
          {cropError && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs w-full">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{cropError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-3 px-4 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApplyCrop} disabled={isProcessing} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            {isProcessing ? 'Cropping...' : 'Apply 3:4 Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
