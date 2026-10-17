import { getOptimizedImageUrl, type ImagePreset } from '@celebs/shared-utils';

/**
 * Public media origin (Cloudflare R2). Every stored key in the database is
 * relative to this host.
 */
export const R2_PUBLIC_MEDIA_URL =
  process.env.EXPO_PUBLIC_MEDIA_URL ||
  process.env.EXPO_PUBLIC_R2_MEDIA_URL ||
  'https://media.celebs.com.np';

/**
 * Origin used to resolve ROOT-RELATIVE media paths (`/uploads/x.jpg`).
 *
 * Registered once at boot by `constants/config`, which is the only module
 * allowed to know about the dev/prod API host. Keeping it out of this module
 * is what lets the resolver stay free of native imports — and therefore
 * importable from the plain-node unit test environment.
 */
let mediaDevOrigin = '';

export function setMediaDevOrigin(origin: string): void {
  mediaDevOrigin = origin.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
}

export interface ResolveImageOptions {
  /** Named size from the shared pipeline, e.g. 'grid-card' / 'pdp-hero'. */
  preset?: ImagePreset;
  dpr?: 1 | 2 | 3;
}

/**
 * The single guard every render site must use before handing a URI to an
 * `<Image>`. Whitespace is not a picture, so `'   '` is NOT renderable — this
 * is the disagreement the two old resolvers had (one returned the CDN root for
 * a blank string, the other returned the blank string itself).
 */
export function hasRenderableImage(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

const LOOPBACK_MINIO = /127\.0\.0\.1:9000|localhost:9000/;

/** `http://127.0.0.1:9000/celebs/products/a.jpg` -> `products/a.jpg` */
function minioKey(url: string): string {
  return url
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^celebs\//, '')
    .replace(/^\/+/, '');
}

function toAbsoluteMediaUrl(trimmed: string): string {
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) {
    // Legacy local MinIO loopback URLs -> Cloudflare R2 public base.
    return LOOPBACK_MINIO.test(trimmed) ? `${R2_PUBLIC_MEDIA_URL}/${minioKey(trimmed)}` : trimmed;
  }
  // Root-relative or a bare object key stored in the DB.
  const origin = mediaDevOrigin || R2_PUBLIC_MEDIA_URL;
  return `${origin}/${trimmed.replace(/^\/+/, '')}`;
}

/**
 * THE canonical image resolution order for every render site in the app:
 *
 *   1. stored key/URL  ->  absolute, loadable media URL
 *   2. absolute URL    ->  sized derivative (`getOptimizedImageUrl`)
 *
 * It returns `''` — never a half-built URL and never the CDN root — for any
 * input that cannot be rendered, so a caller can branch on the return value
 * and `<Image source={{ uri: '' }}>` is structurally impossible.
 */
export function resolveImageUrl(raw?: string | null, options: ResolveImageOptions = {}): string {
  if (!hasRenderableImage(raw)) return '';
  const absolute = toAbsoluteMediaUrl((raw as string).trim());
  if (!absolute) return '';
  return getOptimizedImageUrl(absolute, options) || absolute;
}

/** First non-blank entry of a gallery, or undefined. */
export function firstRenderableImage(images?: readonly unknown[] | null): string | undefined {
  if (!Array.isArray(images)) return undefined;
  for (const candidate of images) {
    if (hasRenderableImage(candidate as string)) return (candidate as string).trim();
  }
  return undefined;
}
