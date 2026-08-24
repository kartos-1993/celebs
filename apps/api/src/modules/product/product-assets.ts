import { Prisma } from '@prisma/client';

export const toJsonInput = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Collects every media CDN URL referenced by a product (main images,
 * per-color variant galleries, and dynamic per-color swatches) so media
 * usage counters can be kept in sync with the product lifecycle.
 */
export const collectProductAssetUrls = (source: {
  mainImages?: unknown;
  colorVariants?: unknown;
  dynamicData?: unknown;
}): string[] => {
  const urls: string[] = [];

  if (Array.isArray(source.mainImages)) {
    urls.push(
      ...(source.mainImages as unknown[]).filter((u): u is string => typeof u === 'string'),
    );
  }

  if (Array.isArray(source.colorVariants)) {
    for (const variant of source.colorVariants as Array<Record<string, unknown>>) {
      if (typeof variant?.swatch === 'string') urls.push(variant.swatch);
      if (Array.isArray(variant?.images)) {
        urls.push(
          ...(variant.images as unknown[]).filter((u): u is string => typeof u === 'string'),
        );
      }
    }
  }

  const colorMeta = (
    source.dynamicData as Record<string, unknown> | undefined
  )?.variants as Record<string, unknown> | undefined;

  const metaGroups: Array<Record<string, unknown>> = [];
  if (colorMeta && typeof colorMeta === 'object') {
    // Current shape: variants.colorMeta.<ColorKey> = { swatch, images, name? }
    const colorMetaMap = colorMeta.colorMeta as Record<string, unknown> | undefined;
    if (colorMetaMap && typeof colorMetaMap === 'object') {
      metaGroups.push(
        ...Object.values(colorMetaMap).filter(
          (m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object',
        ),
      );
    } else {
      // Legacy fallback: variants.<ColorKey> = { swatch, images }
      metaGroups.push(
        ...Object.values(colorMeta).filter(
          (m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object',
        ),
      );
    }
  }

  for (const meta of metaGroups) {
    if (typeof meta.swatch === 'string') urls.push(meta.swatch);
    if (Array.isArray(meta.images)) {
      urls.push(...(meta.images as unknown[]).filter((u): u is string => typeof u === 'string'));
    }
  }

  return urls;
};
