import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCroppedFileName,
  computeCropOutputSize,
  resolveCleanCropSource,
} from '../crop-canvas';

import { axiosClient } from '@/lib/axios/axios-client';

vi.mock('@/lib/axios/axios-client', () => ({
  axiosClient: { get: vi.fn().mockRejectedValue(new Error('proxy down')) },
}));

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 1000;
  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

describe('crop-canvas output helpers', () => {
  describe('buildCroppedFileName', () => {
    it('trims the edited name and forces .webp', () => {
      expect(buildCroppedFileName('  My Crop  ', 'photo.jpg')).toBe('My Crop.webp');
    });

    it('truncates the edited name to 40 chars', () => {
      expect(buildCroppedFileName('x'.repeat(50), 'photo.jpg')).toBe(`${'x'.repeat(40)}.webp`);
    });

    it('falls back to the extension-stripped default name', () => {
      expect(buildCroppedFileName('', 'photo.jpg')).toBe('photo.webp');
      expect(buildCroppedFileName('   ', 'archive.tar.gz')).toBe('archive.tar.webp');
    });

    it('falls back to image when no default name exists', () => {
      expect(buildCroppedFileName('')).toBe('image.webp');
    });
  });

  describe('computeCropOutputSize', () => {
    it('clamps tiny sources up to 1200 wide', () => {
      expect(computeCropOutputSize(800, 0.75)).toEqual({ width: 1200, height: 1600 });
    });

    it('clamps huge sources down to 2400 wide', () => {
      expect(computeCropOutputSize(5000, 0.75)).toEqual({ width: 2400, height: 3200 });
    });

    it('derives height from the aspect ratio within bounds', () => {
      expect(computeCropOutputSize(1600, 0.8)).toEqual({ width: 1600, height: 2000 });
    });
  });
});

describe('gap: unresolvable remote sources fail closed', () => {
  let revoked: string[] = [];

  beforeEach(() => {
    revoked = [];
    let seq = 0;
    URL.createObjectURL = (() => `blob:mock-${seq++}`) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = ((url: string) => {
      revoked.push(url);
    }) as unknown as typeof URL.revokeObjectURL;
  });

  it('rejects when the backend proxy AND direct fetch both fail', async () => {
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net down')));
    // A bare cross-origin fallback would taint the canvas, so an unresolvable
    // source must be an error — never a remote URL handed to the canvas.
    await expect(
      resolveCleanCropSource({ url: 'https://cdn.test/remote.jpg', name: 'remote' }),
    ).rejects.toThrow(/Could not load/);
    vi.unstubAllGlobals();
  });

  it('never leaks a blob URL when the resolution fails after the fetch', async () => {
    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      set src(_value: string) {
        throw new Error('decode boom');
      }
    }
    vi.stubGlobal('Image', BrokenImage);
    const blob = new Blob(['x'], { type: 'image/png' });
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: blob } as never);

    await expect(
      resolveCleanCropSource({ url: 'https://cdn.test/x.png', name: 'x' }),
    ).rejects.toThrow(/decode boom/);
    expect(revoked).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it('still resolves through the authenticated proxy when it returns bytes', async () => {
    vi.stubGlobal('Image', MockImage);
    const blob = new Blob(['x'], { type: 'image/png' });
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: blob } as never);

    const resolved = await resolveCleanCropSource({
      url: 'https://cdn.test/remote.jpg',
      name: 'remote',
    });

    expect(resolved.blobUrl.startsWith('blob:')).toBe(true);
    expect(resolved.naturalWidth).toBe(800);
    expect(resolved.naturalHeight).toBe(1000);
    resolved.cleanup();
    expect(revoked).toEqual([resolved.blobUrl]);
    vi.unstubAllGlobals();
  });
});
