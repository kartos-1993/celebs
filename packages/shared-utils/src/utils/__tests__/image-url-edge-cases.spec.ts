import { describe, expect, it } from 'vitest';

import {
  buildDprSrcSet,
  configureImagePipeline,
  getOptimizedImageUrl,
  isEdgeTransformableUrl,
  isRewritableLocalDerivative,
} from '../image-url';

describe('image-url edge cases', () => {
  it('blank input is returned UNCHANGED, never collapsed to an empty string', () => {
    // No local placeholder image exists in the repo (apps/mobile/assets holds
    // only icons/logos), so the only honest answer for a blank input is the
    // input itself — image-less products must be handled by the caller
    // (skeleton, initials, or nothing), never by inventing a URL here.
    configureImagePipeline({ edgeHostnames: [], enableEdgeTransform: false });
    expect(getOptimizedImageUrl('')).toBe('');
    expect(getOptimizedImageUrl('   ')).toBe('   ');
    expect(getOptimizedImageUrl(null)).toBe('');
    expect(getOptimizedImageUrl(undefined)).toBe('');
  });

  it('query-string local URLs rewrite the derivative and preserve the query', () => {
    const withQuery = 'http://localhost:9000/celebs/products/dress.webp?v=123';
    expect(getOptimizedImageUrl(withQuery, { preset: 'thumbnail' })).toBe(
      'http://localhost:9000/celebs/products/dress-thumb.webp?v=123',
    );
  });

  it('local URLs without a rewritable extension are explicitly reported as un-rewritable', () => {
    const noExt = 'http://localhost:9000/celebs/products/dress?v=123';
    expect(getOptimizedImageUrl(noExt, { preset: 'thumbnail' })).toBe(noExt);
    expect(isRewritableLocalDerivative(noExt)).toBe(false);
    expect(isRewritableLocalDerivative('http://localhost:9000/a/dress.webp?v=1')).toBe(true);
  });

  it('non-transformable host returns clean master URL unchanged', () => {
    configureImagePipeline({ edgeHostnames: [], enableEdgeTransform: false });
    const ext = 'https://images.unsplash.com/photo-123?w=400';
    expect(getOptimizedImageUrl(ext, { preset: 'grid-card' })).toBe(ext);
  });

  it('edge transform preserves source query string after params (pinned as-is)', () => {
    configureImagePipeline({
      edgeHostnames: ['media.celebs.com.np'],
      enableEdgeTransform: true,
    });
    const src = 'https://media.celebs.com.np/a/b.webp?token=abc';
    const out = getOptimizedImageUrl(src, { preset: 'grid-card' });
    expect(out).toContain('/cdn-cgi/image/');
    expect(out.endsWith('?token=abc')).toBe(true);
    configureImagePipeline({ edgeHostnames: [], enableEdgeTransform: false });
  });

  it('isEdgeTransformableUrl rejects empty + relative paths (pinned)', () => {
    expect(isEdgeTransformableUrl('')).toBe(false);
    expect(isEdgeTransformableUrl('/local/path.webp')).toBe(false);
  });

  it('buildDprSrcSet on empty source returns "" (pinned)', () => {
    expect(buildDprSrcSet('')).toBe('');
  });
});
