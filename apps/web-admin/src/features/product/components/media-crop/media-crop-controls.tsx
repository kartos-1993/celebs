import { AlertTriangle, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import type { NaturalDimensions } from './crop-canvas';

interface Props {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
  isLowRes: boolean;
  naturalDims: NaturalDimensions;
  cropError: string | null;
}

export function MediaCropControls({
  zoom,
  onZoomChange,
  onReset,
  isLowRes,
  naturalDims,
  cropError,
}: Props) {
  return (
    <>
      <div className="flex w-full max-w-xs items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <input
          type="range"
          min="0.5"
          max="2.5"
          step="0.05"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="h-1.5 w-32 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onReset}
          title="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLowRes && (
        <div className="flex w-full items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Original is {naturalDims.width}x{naturalDims.height}px. High-res zoom may look soft.
            (Recommended 1200x1600px+).
          </span>
        </div>
      )}

      {cropError && (
        <div className="flex w-full items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{cropError}</span>
        </div>
      )}
    </>
  );
}
