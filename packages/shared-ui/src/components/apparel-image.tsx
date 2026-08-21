import React, { useState } from 'react';
import {
  buildDprSrcSet,
  buildWidthSrcSet,
  getOptimizedImageUrl,
  type ImagePreset,
} from '@celebs/shared-utils';
import { cn } from '../lib/utils';

export interface ApparelImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  preset?: ImagePreset;
  sizes?: string;
  priority?: boolean;
  aspectRatioClass?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export const ApparelImage: React.FC<ApparelImageProps> = ({
  src,
  alt,
  preset = 'grid-card',
  sizes,
  priority = false,
  aspectRatioClass = 'aspect-[3/4]',
  containerClassName,
  className,
  fallbackIcon,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const cleanSrc = src?.trim() || '';

  if (!cleanSrc || hasError) {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground/50',
          aspectRatioClass,
          containerClassName,
        )}
      >
        {fallbackIcon || (
          <svg
            className="h-8 w-8 stroke-1 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
    );
  }

  const optimizedSrc = getOptimizedImageUrl(cleanSrc, { preset });
  const srcSet = sizes
    ? buildWidthSrcSet(cleanSrc)
    : buildDprSrcSet(cleanSrc, { preset });

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md bg-muted/30',
        aspectRatioClass,
        containerClassName,
      )}
    >
      <img
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        {...props}
      />
    </div>
  );
};
