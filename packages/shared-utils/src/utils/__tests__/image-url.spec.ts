import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildDprSrcSet,
  buildWidthSrcSet,
  configureImagePipeline,
  getOptimizedImageUrl,
  IMAGE_PRESETS,
  isEdgeTransformActive,
  isEdgeTransformableUrl,
} from '../image-url';

describe('Apparel Image URL Pipeline & Dynamic CDN Configuration', () => {
  const r2Url = 'https://media.celebs.com.np/vendors/v123/products/summer-dress.webp';
  const externalUrl = 'https://images.unsplash.com/photo-12345.jpg';
  const localUrl = 'http://localhost:9000/celebs/products/dress.webp';

  beforeEach(() => {
    // Reset configuration to safe defaults
    configureImagePipeline({
      edgeHostnames: [],
      enableEdgeTransform: false,
    });
  });

  describe('Safe Defaults (Unconfigured Cloudflare)', () => {
    it('returns clean master URL without /cdn-cgi/image/ if edge transform is disabled', () => {
      const result = getOptimizedImageUrl(r2Url, { preset: 'grid-card' });
      expect(result).toBe(r2Url);
    });

    it('returns empty string for empty inputs', () => {
      expect(getOptimizedImageUrl('')).toBe('');
      expect(getOptimizedImageUrl(null)).toBe('');
      expect(getOptimizedImageUrl(undefined)).toBe('');
    });

    it('returns data and blob URLs unchanged', () => {
      const dataUrl = 'data:image/webp;base64,UklGRk...';
      const blobUrl = 'blob:http://localhost:3000/123-abc';
      expect(getOptimizedImageUrl(dataUrl)).toBe(dataUrl);
      expect(getOptimizedImageUrl(blobUrl)).toBe(blobUrl);
    });
  });

  describe('Configured Cloudflare CDN Mode', () => {
    beforeEach(() => {
      configureImagePipeline({
        edgeHostnames: ['media.celebs.com.np', 'cdn.celebs.com'],
        enableEdgeTransform: true,
      });
    });

    it('detects transformable hostnames correctly', () => {
      expect(isEdgeTransformableUrl(r2Url)).toBe(true);
      expect(isEdgeTransformableUrl(externalUrl)).toBe(false);
      expect(isEdgeTransformableUrl(localUrl)).toBe(false);
    });

    it('generates Cloudflare /cdn-cgi/image/ transformation URL with grid-card preset', () => {
      const result = getOptimizedImageUrl(r2Url, { preset: 'grid-card' });
      expect(result).toBe(
        'https://media.celebs.com.np/cdn-cgi/image/width=360,height=480,quality=80,fit=cover,format=auto/vendors/v123/products/summer-dress.webp',
      );
    });

    it('generates Cloudflare transformation URL with custom DPR multipliers', () => {
      const result2x = getOptimizedImageUrl(r2Url, { preset: 'grid-card', dpr: 2 });
      expect(result2x).toBe(
        'https://media.celebs.com.np/cdn-cgi/image/width=720,height=960,quality=80,fit=cover,format=auto/vendors/v123/products/summer-dress.webp',
      );

      const result3x = getOptimizedImageUrl(r2Url, { preset: 'grid-card', dpr: 3 });
      expect(result3x).toBe(
        'https://media.celebs.com.np/cdn-cgi/image/width=1080,height=1440,quality=80,fit=cover,format=auto/vendors/v123/products/summer-dress.webp',
      );
    });

    it('handles pdp-hero and zoom presets', () => {
      const hero = getOptimizedImageUrl(r2Url, { preset: 'pdp-hero' });
      expect(hero).toBe(
        'https://media.celebs.com.np/cdn-cgi/image/width=750,height=1000,quality=85,fit=inside,format=auto/vendors/v123/products/summer-dress.webp',
      );

      const zoom = getOptimizedImageUrl(r2Url, { preset: 'zoom' });
      expect(zoom).toBe(
        'https://media.celebs.com.np/cdn-cgi/image/width=1500,height=2000,quality=90,fit=inside,format=auto/vendors/v123/products/summer-dress.webp',
      );
    });

    it('prevents nested /cdn-cgi/image/ paths if URL is already transformed', () => {
      const alreadyTransformed =
        'https://media.celebs.com.np/cdn-cgi/image/width=100,height=100/vendors/v123/products/dress.webp';
      const result = getOptimizedImageUrl(alreadyTransformed, { preset: 'pdp-hero' });
      expect(result).toBe(
        'https://media.celebs.com.np/cdn-cgi/image/width=750,height=1000,quality=85,fit=inside,format=auto/vendors/v123/products/dress.webp',
      );
    });

    it('builds 1x, 2x, 3x DPR srcset', () => {
      const srcSet = buildDprSrcSet(r2Url, { preset: 'grid-card' });
      expect(srcSet).toContain('width=360,height=480');
      expect(srcSet).toContain(' 1x');
      expect(srcSet).toContain('width=720,height=960');
      expect(srcSet).toContain(' 2x');
      expect(srcSet).toContain('width=1080,height=1440');
      expect(srcSet).toContain(' 3x');
    });

    it('builds width descriptors srcset', () => {
      const srcSet = buildWidthSrcSet(r2Url, [360, 720, 1080]);
      expect(srcSet).toContain('width=360');
      expect(srcSet).toContain(' 360w');
      expect(srcSet).toContain('width=720');
      expect(srcSet).toContain(' 720w');
      expect(srcSet).toContain('width=1080');
      expect(srcSet).toContain(' 1080w');
    });
  });

  describe('Local Development Fallback', () => {
    it('maps local non-Cloudflare URLs to static derivatives', () => {
      const thumb = getOptimizedImageUrl(localUrl, { preset: 'thumbnail' });
      expect(thumb).toBe('http://localhost:9000/celebs/products/dress-thumb.webp');

      const card = getOptimizedImageUrl(localUrl, { preset: 'grid-card' });
      expect(card).toBe('http://localhost:9000/celebs/products/dress-card.webp');

      const zoom = getOptimizedImageUrl(localUrl, { preset: 'zoom' });
      expect(zoom).toBe('http://localhost:9000/celebs/products/dress-zoom.webp');
    });
  });

  describe('3:4 Aspect Ratio Matrix', () => {
    it('enforces 3:4 portrait aspect ratio (0.75) across catalog presets', () => {
      const presets = ['thumbnail', 'grid-card', 'pdp-hero', 'zoom'] as const;
      for (const p of presets) {
        const config = IMAGE_PRESETS[p];
        const ratio = config.width / config.height;
        expect(ratio).toBeCloseTo(0.75, 2);
      }
    });
  });
});
