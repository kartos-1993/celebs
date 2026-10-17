import type { AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PresignFileResponse } from '@celebs/shared-types';

import {
  directUploadBatch,
  directUploadFiles,
  encodeToWebP,
  extractApiErrorMessage,
  PRESIGN_BATCH_SIZE,
  splitIntoBatches,
} from '../media-upload';

import { axiosClient } from '@/lib/axios/axios-client';

vi.mock('@/lib/axios/axios-client', () => ({ axiosClient: { post: vi.fn() } }));

const post = vi.mocked(axiosClient.post);

const presignItem = (key: string): PresignFileResponse => ({
  key,
  uploadUrl: `https://r2.test/${key}`,
  publicUrl: `https://cdn.test/${key}`,
  headers: { 'Content-Type': 'application/pdf' },
  expiresIn: 900,
  originalname: key,
  mimeType: 'application/pdf',
  size: 10,
});

describe('media-upload batching', () => {
  beforeEach(() => {
    post.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('extractApiErrorMessage', () => {
    it('prefers joined field validation messages', () => {
      const error = {
        response: { data: { errors: [{ message: 'Bad sku' }, { message: 'Bad price' }] } },
      };
      expect(extractApiErrorMessage(error, 'fallback')).toBe('Bad sku. Bad price');
    });

    it('uses the server message unless it is the generic validation sentinel', () => {
      expect(extractApiErrorMessage({ response: { data: { message: 'Boom' } } }, 'fallback')).toBe(
        'Boom',
      );
      const netError = Object.assign(new Error('net down'), {
        response: { data: { message: 'Validation failed' } },
      });
      expect(extractApiErrorMessage(netError, 'fallback')).toBe('net down');
    });

    it('falls back for empty or non-Error shapes', () => {
      expect(extractApiErrorMessage({}, 'fallback')).toBe('fallback');
      expect(extractApiErrorMessage({ response: { data: { errors: [{}] } } }, 'fallback')).toBe(
        'fallback',
      );
    });
  });

  describe('encodeToWebP', () => {
    it('preserves PDFs untouched (no canvas path)', async () => {
      const pdf = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
      const result = await encodeToWebP(pdf);
      expect(result.file).toBe(pdf);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.originalName).toBe('doc.pdf');
    });

    it('passes non-images through with their own type', async () => {
      const text = new File(['hi'], 'note.txt', { type: 'text/plain' });
      const result = await encodeToWebP(text);
      expect(result.file).toBe(text);
      expect(result.mimeType).toBe('text/plain');
    });
  });

  describe('splitIntoBatches', () => {
    it('chunks 25 files into 10/10/5 preserving order', () => {
      const files = Array.from({ length: 25 }, (_, i) => i);
      expect(splitIntoBatches(files)).toEqual([
        files.slice(0, 10),
        files.slice(10, 20),
        files.slice(20, 25),
      ]);
    });

    it('handles empty input and custom sizes', () => {
      expect(splitIntoBatches([])).toEqual([]);
      expect(splitIntoBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('defaults to the backend batch cap', () => {
      expect(PRESIGN_BATCH_SIZE).toBe(10);
    });
  });

  describe('directUploadBatch', () => {
    it('short-circuits empty input without any presign call', async () => {
      await expect(directUploadBatch([])).resolves.toEqual([]);
      expect(post).not.toHaveBeenCalled();
    });
  });
});

describe('gap: one failed PUT does not abort the whole batch', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValueOnce({
      data: { data: [presignItem('a.pdf'), presignItem('b.pdf')] },
    } as unknown as AxiosResponse);
    post.mockResolvedValue({
      data: { data: { url: 'https://cdn.test/ok.webp' } },
    } as unknown as AxiosResponse);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pdf = (name: string) => new File([`${name}-bytes!`], name, { type: 'application/pdf' });

  it('settles per file: the good file keeps its URL and the bad one keeps its identity', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('b.pdf')) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const a = pdf('a.pdf');
    const b = pdf('b.pdf');
    const outcomes = await directUploadFiles([a, b]);

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]).toEqual({ file: a, url: 'https://cdn.test/ok.webp' });
    expect(outcomes[1]?.file).toBe(b);
    expect(outcomes[1]?.url).toBeUndefined();
    expect(outcomes[1]?.error?.message).toBe('"b.pdf" failed to transfer (status 500)');
  });

  it('keeps the throwing wrapper contract with an aggregate naming the failure', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('b.pdf')) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const error = await directUploadBatch([pdf('a.pdf'), pdf('b.pdf')]).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(Error);
    const aggregate = error as { errors?: Error[] };
    expect(aggregate.errors).toHaveLength(1);
    expect(aggregate.errors?.[0]?.message).toMatch(/b\.pdf/);
  });

  it('returns the ordered URL list when every file lands', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    await expect(directUploadBatch([pdf('a.pdf'), pdf('b.pdf')])).resolves.toEqual([
      'https://cdn.test/ok.webp',
      'https://cdn.test/ok.webp',
    ]);
  });

  it('attributes a whole-chunk presign rejection to every file in the chunk', async () => {
    post.mockReset();
    post.mockRejectedValue({ response: { data: { message: 'Bad Request' } } });
    const a = pdf('a.pdf');
    const b = pdf('b.pdf');

    const outcomes = await directUploadFiles([a, b]);

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]).toEqual({ file: a, error: new Error('"a.pdf" Bad Request') });
    expect(outcomes[1]?.error?.message).toBe('"b.pdf" Bad Request');
  });

  it('names a file the presign response skipped', async () => {
    post.mockReset();
    post.mockResolvedValueOnce({
      data: { data: [presignItem('a.pdf')] },
    } as unknown as AxiosResponse);
    post.mockResolvedValue({
      data: { data: { url: 'https://cdn.test/ok.webp' } },
    } as unknown as AxiosResponse);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const outcomes = await directUploadFiles([pdf('a.pdf'), pdf('b.pdf')]);

    expect(outcomes[0]?.url).toBeTruthy();
    expect(outcomes[1]?.error?.message).toBe('"b.pdf" was not accepted for upload');
  });
});
