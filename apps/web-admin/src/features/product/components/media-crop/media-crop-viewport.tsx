import React from 'react';

import type { OffsetPosition } from './crop-canvas';

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  imgSrc: string | null;
  zoom: number;
  offset: OffsetPosition;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

export function MediaCropViewport({
  containerRef,
  imageRef,
  imgSrc,
  zoom,
  offset,
  isDragging,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: Props) {
  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] w-64 cursor-grab select-none overflow-hidden rounded-lg border-2 border-primary/60 bg-black shadow-inner active:cursor-grabbing"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
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
          className="pointer-events-none h-full w-full max-w-none object-cover"
        />
      )}

      {/* Rule of Thirds Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/20">
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
  );
}
