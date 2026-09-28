import { describe, expect, it } from 'vitest';

import { R2_PUBLIC_MEDIA_URL, resolveImageUrl, setMediaDevOrigin } from '../image';

describe('resolveImageUrl — the one canonical order', () => {
  it('turns a stored object key into an absolute media URL', () => {
    expect(resolveImageUrl('products/mug.jpg')).toBe(`${R2_PUBLIC_MEDIA_URL}/products/mug.jpg`);
    expect(resolveImageUrl('  products/mug.jpg  ')).toBe(`${R2_PUBLIC_MEDIA_URL}/products/mug.jpg`);
  });

  it('resolves root-relative media against the registered dev origin', () => {
    setMediaDevOrigin('http://192.168.1.5:3333/api/v1');
    expect(resolveImageUrl('/uploads/a.jpg')).toBe('http://192.168.1.5:3333/uploads/a.jpg');
    setMediaDevOrigin('');
    expect(resolveImageUrl('/uploads/a.jpg')).toBe(`${R2_PUBLIC_MEDIA_URL}/uploads/a.jpg`);
  });

  it('rewrites legacy local MinIO loopback URLs onto the public CDN', () => {
    expect(resolveImageUrl('http://127.0.0.1:9000/celebs/products/a.jpg')).toBe(
      `${R2_PUBLIC_MEDIA_URL}/products/a.jpg`,
    );
    expect(resolveImageUrl('http://localhost:9000/products/a.jpg')).toBe(
      `${R2_PUBLIC_MEDIA_URL}/products/a.jpg`,
    );
  });

  it('leaves an already-absolute CDN URL alone', () => {
    const url = `${R2_PUBLIC_MEDIA_URL}/products/a.jpg`;
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('never turns a blank input into the CDN root (the old resolver did)', () => {
    // The old `resolveImageUrl('   ')` returned the live media ROOT, so every
    // image-less product rendered a request for `https://media.celebs.com.np/`.
    for (const blank of ['', '   ', '\n', null, undefined]) {
      expect(resolveImageUrl(blank)).toBe('');
    }
  });

  it('passes data:/blob: sources straight through', () => {
    expect(resolveImageUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(resolveImageUrl('blob:abc')).toBe('blob:abc');
  });
});
