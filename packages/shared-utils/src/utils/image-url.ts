export const IMAGE_PRESETS = {
  thumbnail: { width: 120, height: 160, quality: 75, fit: 'cover' as const },
  'grid-card': { width: 360, height: 480, quality: 80, fit: 'cover' as const },
  'pdp-hero': { width: 750, height: 1000, quality: 85, fit: 'inside' as const },
  zoom: { width: 1500, height: 2000, quality: 90, fit: 'inside' as const },
  swatch: { width: 60, height: 60, quality: 75, fit: 'cover' as const },
  avatar: { width: 80, height: 80, quality: 80, fit: 'cover' as const },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export interface ImageTransformOptions {
  preset?: ImagePreset;
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'cover' | 'contain' | 'inside' | 'crop';
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  dpr?: 1 | 2 | 3;
  /**
   * Explicitly force or disable edge transformation for this call.
   */
  enableEdgeTransform?: boolean;
}

export interface ImagePipelineConfig {
  /**
   * Hostnames that support Cloudflare /cdn-cgi/image/ transformations (e.g. ['media.celebs.com.np']).
   */
  edgeHostnames: string[];
  /**
   * Master switch to enable /cdn-cgi/image/ URL generation.
   * If false, returns clean URLs or local derivatives.
   */
  enableEdgeTransform: boolean;
}

/**
 * Global runtime configuration with safe defaults (disabled until configured).
 */
const globalPipelineConfig: ImagePipelineConfig = {
  edgeHostnames: [],
  enableEdgeTransform: false,
};

/**
 * Configures the image pipeline at application startup.
 */
export function configureImagePipeline(config: Partial<ImagePipelineConfig>): void {
  if (Array.isArray(config.edgeHostnames)) {
    globalPipelineConfig.edgeHostnames = config.edgeHostnames;
  }
  if (typeof config.enableEdgeTransform === 'boolean') {
    globalPipelineConfig.enableEdgeTransform = config.enableEdgeTransform;
  }
}

/**
 * Checks whether edge transformation is enabled via environment variables or runtime config.
 */
export function isEdgeTransformActive(): boolean {
  if (globalPipelineConfig.enableEdgeTransform) {
    return true;
  }
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.NEXT_PUBLIC_ENABLE_EDGE_TRANSFORM === 'true' ||
      process.env.EXPO_PUBLIC_ENABLE_EDGE_TRANSFORM === 'true' ||
      process.env.ENABLE_EDGE_TRANSFORM === 'true'
    );
  }
  return false;
}

/**
 * Resolves the list of configured edge hostnames from environment or runtime config.
 */
export function getRegisteredEdgeHostnames(): string[] {
  const envHosts =
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_CDN_IMAGE_HOSTS ||
        process.env.EXPO_PUBLIC_CDN_IMAGE_HOSTS ||
        process.env.CDN_IMAGE_HOSTS ||
        ''
      : '';

  const parsedEnvHosts = envHosts
    .split(',')
    .map((h: string) => h.trim())
    .filter(Boolean);

  return Array.from(new Set([...globalPipelineConfig.edgeHostnames, ...parsedEnvHosts]));
}

/**
 * Checks whether a given URL is hosted on an edge-transform-capable CDN.
 */
export function isEdgeTransformableUrl(sourceUrl: string): boolean {
  if (!sourceUrl) return false;
  try {
    const urlObj = new URL(sourceUrl);
    const registered = getRegisteredEdgeHostnames();
    if (registered.length === 0) return false;
    return registered.some(
      (host: string) => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

/**
 * Maps a local-dev image URL to its prebuilt static derivative (-thumb/-card/-zoom).
 *
 * The extension is matched on the pathname with any query string or hash
 * preserved, so `/img.jpg?token=abc` still rewrites to
 * `/img-card.webp?token=abc`. URLs without a rewritable image extension are
 * returned untouched with a dev-only warning instead of a silently
 * unoptimized (or corruptly rewritten) URL.
 *
 * NOTE: there is currently no local placeholder image asset in the repo
 * (apps/mobile/assets holds only icons/logos), so a blank input is returned
 * UNCHANGED and image-less products must be handled by the caller (skeleton,
 * initials, or nothing) — never by inventing a remote URL here.
 */
function mapLocalDerivative(trimmed: string, effectiveWidth: number): string {
  const suffix =
    effectiveWidth <= 180 ? '-thumb.webp' : effectiveWidth <= 800 ? '-card.webp' : '-zoom.webp';
  const hashIdx = trimmed.indexOf('#');
  const queryIdx = trimmed.indexOf('?');
  let endIdx = trimmed.length;
  if (queryIdx !== -1) endIdx = Math.min(endIdx, queryIdx);
  if (hashIdx !== -1) endIdx = Math.min(endIdx, hashIdx);
  const head = trimmed.slice(0, endIdx);
  const tail = trimmed.slice(endIdx);
  if (/\.(webp|jpg|jpeg|png)$/i.test(head)) {
    return `${head.replace(/\.(webp|jpg|jpeg|png)$/i, suffix)}${tail}`;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(
      `[image-url] leaving local URL untouched (no rewritable image extension): ${trimmed}`,
    );
  }
  return trimmed;
}

/**
 * Returns the input unchanged when it carries no transformable variant.
 *
 * Previously a local URL that failed the extension rewrite fell through to the
 * "clean master" branch and was returned indistinguishable from an optimized
 * one, so callers had no way to tell a real derivative from a raw original.
 * Keeping the skip explicit means the caller can decide.
 */
export function isRewritableLocalDerivative(sourceUrl: string): boolean {
  const head = sourceUrl.split(/[?#]/)[0] ?? '';
  return /\.(webp|jpg|jpeg|png)$/i.test(head);
}

/**
 * Resolves the effective rendering width, or undefined when nothing was asked
 * for (no preset and no explicit width) — the signal that no optimization
 * branch applies.
 */
function resolveTransform(options: ImageTransformOptions): {
  presetConfig: (typeof IMAGE_PRESETS)[ImagePreset] | null;
  width?: number;
  height?: number;
  quality: number;
  fit: NonNullable<ImageTransformOptions['fit']>;
  format: NonNullable<ImageTransformOptions['format']>;
  dpr: NonNullable<ImageTransformOptions['dpr']>;
} {
  const presetConfig = options.preset ? IMAGE_PRESETS[options.preset] : null;
  return {
    presetConfig,
    width: options.width ?? presetConfig?.width,
    height: options.height ?? presetConfig?.height,
    quality: options.quality ?? presetConfig?.quality ?? 80,
    fit: options.fit ?? presetConfig?.fit ?? 'cover',
    format: options.format ?? 'auto',
    dpr: options.dpr ?? 1,
  };
}

/** Builds a Cloudflare /cdn-cgi/image/ URL, or null when the host is not an edge host. */
function buildEdgeTransformUrl(
  trimmed: string,
  transform: ReturnType<typeof resolveTransform>,
): string | null {
  if (!transform.presetConfig && !transform.width) return null;
  try {
    const urlObj = new URL(trimmed);
    // Strip an existing /cdn-cgi/image/... prefix to prevent nesting.
    const match = urlObj.pathname.match(/^\/cdn-cgi\/image\/[^/]+(\/.*)$/);
    const cleanPathname = match?.[1] ?? urlObj.pathname;

    const params: string[] = [];
    if (transform.width) params.push(`width=${transform.width * transform.dpr}`);
    if (transform.height) params.push(`height=${transform.height * transform.dpr}`);
    params.push(`quality=${transform.quality}`);
    params.push(`fit=${transform.fit}`);
    params.push(`format=${transform.format}`);

    return `${urlObj.origin}/cdn-cgi/image/${params.join(',')}${cleanPathname}${urlObj.search}`;
  } catch {
    return null;
  }
}

/** True for MinIO/localhost dev origins and root-relative asset paths. */
function isLocalDevUrl(trimmed: string): boolean {
  return trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.startsWith('/');
}

/**
 * Generates an optimized Cloudflare /cdn-cgi/image/ transformation URL,
 * a local static derivative fallback, or returns the original clean master URL.
 */
export function getOptimizedImageUrl(
  sourceUrl: string | null | undefined,
  options: ImageTransformOptions = {},
): string {
  // No placeholder asset exists in this repo, so a blank input is returned
  // EXACTLY as it arrived (never ''), keeping the caller's input falsy-check
  // meaningful instead of handing it a silently different value.
  if (sourceUrl === null || sourceUrl === undefined) return '';
  const raw = String(sourceUrl);
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  // Data URLs (base64) or blob URLs are returned as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const transform = resolveTransform(options);
  const wantsTransform = Boolean(transform.width || transform.presetConfig);
  const edgeActive = options.enableEdgeTransform ?? isEdgeTransformActive();

  // 1. Cloudflare CDN Edge Transformation (only if enabled AND host is configured)
  if (edgeActive && wantsTransform && isEdgeTransformableUrl(trimmed)) {
    const edgeUrl = buildEdgeTransformUrl(trimmed, transform);
    if (edgeUrl) return edgeUrl;
  }

  // 2. Local Development / MinIO Static Derivative Mapping
  if (wantsTransform && isLocalDevUrl(trimmed)) {
    // An unrewritable local URL is returned verbatim, but the skip is explicit
    // so callers can tell it apart from a real derivative.
    if (!isRewritableLocalDerivative(trimmed)) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn(`[image-url] no rewritable local derivative for: ${trimmed}`);
      }
      return trimmed;
    }
    const effectiveWidth = (transform.width || 360) * transform.dpr;
    return mapLocalDerivative(trimmed, effectiveWidth);
  }

  // 3. Clean Master URL fallback (Safe default if edge transformation is not active)
  return trimmed;
}

/**
 * Builds responsive srcset string supporting 1x, 2x, and 3x Retina DPRs.
 */
export function buildDprSrcSet(
  sourceUrl: string,
  options: Omit<ImageTransformOptions, 'dpr'> = {},
): string {
  if (!sourceUrl) return '';
  return [1, 2, 3]
    .map(
      (dpr: number) =>
        `${getOptimizedImageUrl(sourceUrl, { ...options, dpr: dpr as 1 | 2 | 3 })} ${dpr}x`,
    )
    .join(', ');
}

/**
 * Builds responsive srcset string with width descriptors for responsive sizes="..." attributes.
 */
export function buildWidthSrcSet(
  sourceUrl: string,
  widths: number[] = [180, 360, 540, 720, 1080, 1500],
  options: Omit<ImageTransformOptions, 'width' | 'dpr'> = {},
): string {
  if (!sourceUrl) return '';
  return widths
    .map((w: number) => `${getOptimizedImageUrl(sourceUrl, { ...options, width: w })} ${w}w`)
    .join(', ');
}
