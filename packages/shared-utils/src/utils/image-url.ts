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
 * Generates an optimized Cloudflare /cdn-cgi/image/ transformation URL,
 * a local static derivative fallback, or returns the original clean master URL.
 */
export function getOptimizedImageUrl(
  sourceUrl: string | null | undefined,
  options: ImageTransformOptions = {},
): string {
  if (!sourceUrl) return '';

  const trimmed = sourceUrl.trim();
  if (!trimmed) return '';

  // Data URLs (base64) or blob URLs are returned as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const presetConfig = options.preset ? IMAGE_PRESETS[options.preset] : null;

  const width = options.width ?? presetConfig?.width;
  const height = options.height ?? presetConfig?.height;
  const quality = options.quality ?? presetConfig?.quality ?? 80;
  const fit = options.fit ?? presetConfig?.fit ?? 'cover';
  const format = options.format ?? 'auto';
  const dpr = options.dpr ?? 1;

  const edgeActive = options.enableEdgeTransform ?? isEdgeTransformActive();

  // 1. Cloudflare CDN Edge Transformation (Only if enabled AND host is configured)
  if (edgeActive && isEdgeTransformableUrl(trimmed)) {
    try {
      const urlObj = new URL(trimmed);

      // Strip existing /cdn-cgi/image/... prefix if present to prevent nesting
      let cleanPathname = urlObj.pathname;
      const cdnCgiMatch = cleanPathname.match(/^\/cdn-cgi\/image\/[^/]+(\/.*)$/);
      if (cdnCgiMatch && cdnCgiMatch[1]) {
        cleanPathname = cdnCgiMatch[1];
      }

      const params: string[] = [];
      if (width) params.push(`width=${width * dpr}`);
      if (height) params.push(`height=${height * dpr}`);
      params.push(`quality=${quality}`);
      params.push(`fit=${fit}`);
      params.push(`format=${format}`);

      return `${urlObj.origin}/cdn-cgi/image/${params.join(',')}${cleanPathname}${urlObj.search}`;
    } catch {
      return trimmed;
    }
  }

  // 2. Local Development / MinIO Static Derivative Mapping (if local path with .webp/.jpg)
  const isLocalDevUrl =
    trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.startsWith('/');

  if (isLocalDevUrl && (width || presetConfig)) {
    const effectiveWidth = (width || 360) * dpr;
    if (effectiveWidth <= 180) {
      return trimmed.replace(/\.(webp|jpg|jpeg|png)$/i, '-thumb.webp');
    }
    if (effectiveWidth <= 800) {
      return trimmed.replace(/\.(webp|jpg|jpeg|png)$/i, '-card.webp');
    }
    if (effectiveWidth > 800) {
      return trimmed.replace(/\.(webp|jpg|jpeg|png)$/i, '-zoom.webp');
    }
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
