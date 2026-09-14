import { Badge } from '@celebs/shared-ui/components/badge';

import { isMulticolorVariant, resolveColorCode } from '../../utils/add-product-helpers';

import type { ProductQueueItem } from './types';

interface PdpOverviewPreviewProps {
  product: ProductQueueItem;
  activePreviewImage: string;
  onSelectImage: (url: string) => void;
  discountPercent: number;
}

/** Live PDP preview body shared by desktop and mobile device frames. */
export function PdpOverviewPreview({
  product,
  activePreviewImage,
  onSelectImage,
  discountPercent,
}: PdpOverviewPreviewProps) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
          <img
            src={activePreviewImage || '/placeholder.svg'}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white backdrop-blur">
            {product.mainImages?.length || 0} Main Images
          </span>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
          {(product.mainImages ?? []).map((imageUrl, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelectImage(imageUrl)}
              aria-label={`View image ${index + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 p-0 transition ${
                activePreviewImage === imageUrl
                  ? 'scale-95 border-primary'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={imageUrl}
                alt={`Thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/placeholder.svg';
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div>
          <Badge variant="outline" className="mb-2">
            {product.brand || 'No Brand'}
          </Badge>
          <h3 className="text-2xl font-bold text-foreground">{product.name}</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            {product.discountedPrice ? (
              <>
                <span className="text-2xl font-extrabold text-foreground">
                  Rs. {product.discountedPrice.toLocaleString()}
                </span>
                <span className="text-base text-muted-foreground line-through">
                  Rs. {product.price.toLocaleString()}
                </span>
                <Badge className="bg-destructive text-destructive-foreground">
                  {discountPercent}% OFF
                </Badge>
              </>
            ) : (
              <span className="text-2xl font-extrabold text-foreground">
                Rs. {product.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {(product.sizes ?? []).length > 0 && (
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Available Sizes
            </span>
            <div className="flex flex-wrap gap-2">
              {(product.sizes ?? []).map((size, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1 text-sm font-medium">
                  {size.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(product.colorVariants ?? []).length > 0 && (
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Color Options ({product.colorVariants?.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {(product.colorVariants ?? []).map((variant, index) => {
                const swatchImg =
                  variant.swatch ||
                  (variant.images && variant.images.length > 0 ? variant.images[0] : null);
                const isMulti = isMulticolorVariant(`${variant.name} ${variant.colorCode}`);
                const safeBg = resolveColorCode(variant.colorCode || variant.name);

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1.5 transition-colors hover:bg-muted/50"
                    title={variant.name}
                  >
                    {swatchImg ? (
                      <img
                        src={swatchImg}
                        alt={variant.name}
                        className="h-5 w-5 rounded-full border object-cover shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : isMulti ? (
                      <div
                        className="h-5 w-5 rounded-full border shadow-2xs"
                        style={{
                          background:
                            'conic-gradient(#ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                        }}
                      />
                    ) : (
                      <div
                        className="h-5 w-5 rounded-full border shadow-2xs"
                        style={{ backgroundColor: safeBg }}
                      />
                    )}
                    <span className="pr-1 text-xs font-medium">{variant.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </span>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground line-clamp-4">
            {product.description || 'No description provided.'}
          </p>
        </div>
      </div>
    </div>
  );
}
