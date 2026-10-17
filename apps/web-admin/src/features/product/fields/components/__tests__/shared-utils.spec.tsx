import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductApiService } from '../../../api';
import { MultiImageGrid } from '../multi-image-grid';
import {
  __resetUploadInFlightForTests,
  asAcceptList,
  FALLBACK_ACCEPT,
  getPathError,
  imageValueKey,
  mergeUniqueUrls,
  resolveAcceptAttr,
  rulesFrom,
  takeSingleUrl,
  toImageValues,
  uploadErrorMessage,
  uploadImageFiles,
  uploadImageFilesDetailed,
  validateFileBasics,
} from '../shared-utils';
import { SingleCoverDropzone } from '../single-cover-dropzone';

vi.mock('../../../api', () => ({ ProductApiService: { uploadFiles: vi.fn() } }));

const uploadMock = vi.mocked(ProductApiService.uploadFiles);

const pngFile = (name = 'a.png', size = 1024) =>
  new File(['x'.repeat(size)], name, { type: 'image/png', lastModified: 1700000000000 });

// Applies to every describe below: the in-flight dedupe map is module state.
beforeEach(() => {
  uploadMock.mockReset();
  __resetUploadInFlightForTests();
});

describe('shared-utils upload helpers', () => {
  describe('validateFileBasics', () => {
    it('accepts an allowed type within maxSize', () => {
      expect(validateFileBasics(pngFile(), { accept: ['image/png'], maxSize: 1024 * 1024 })).toBe(
        null,
      );
    });

    it('accepts anything when no options are given', () => {
      const anything = new File(['x'], 'a.bin', { type: 'application/octet-stream' });
      expect(validateFileBasics(anything, {})).toBe(null);
    });

    it('treats size exactly equal to maxSize as valid (strict > comparison)', () => {
      expect(validateFileBasics(pngFile('edge.png', 100), { maxSize: 100 })).toBe(null);
    });

    it('reports oversize with a rounded MB message', () => {
      const big = pngFile('big.png', 6 * 1024 * 1024);
      expect(validateFileBasics(big, { maxSize: 5 * 1024 * 1024 })).toBe(
        'Each image must be <= 5MB',
      );
    });

    it('rejects a type outside the accept list', () => {
      const gif = new File(['x'], 'a.gif', { type: 'image/gif' });
      expect(validateFileBasics(gif, { accept: ['image/png'] })).toBe('Invalid file type');
    });
  });

  describe('imageValueKey', () => {
    it('uses the URL itself as the key for string values', () => {
      expect(imageValueKey('https://cdn/x.webp')).toBe('https://cdn/x.webp');
    });

    it('keys Files by name-size-lastModified', () => {
      expect(imageValueKey(pngFile('a.png', 10))).toBe('a.png-10-1700000000000');
    });
  });

  describe('uploadErrorMessage', () => {
    it('unwraps Error messages', () => {
      expect(uploadErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('falls back for non-Error throws', () => {
      expect(uploadErrorMessage('nope')).toBe('Image upload failed. Try again.');
    });
  });

  describe('uploadImageFiles', () => {
    it('short-circuits empty input without calling the API', async () => {
      await expect(uploadImageFiles([])).resolves.toEqual([]);
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('throws naming the file that came back without a URL', async () => {
      uploadMock.mockResolvedValueOnce(['https://cdn/a.webp']).mockResolvedValueOnce([]);
      await expect(uploadImageFiles([pngFile('a.png'), pngFile('b.png')])).rejects.toThrow(
        /b\.png/,
      );
    });

    it('passes URLs through when counts match', async () => {
      uploadMock.mockResolvedValue(['https://cdn/a.webp']);
      await expect(uploadImageFiles([pngFile()])).resolves.toEqual(['https://cdn/a.webp']);
    });
  });

  describe('getPathError', () => {
    it('resolves dotted paths through the RHF error tree', () => {
      const errors = { variants: { colorMeta: { Red: { images: { message: 'Required' } } } } };
      expect(getPathError(errors, 'variants.colorMeta.Red.images')?.message).toBe('Required');
    });

    it('returns undefined for missing paths, non-objects, and message-less nodes', () => {
      expect(getPathError({ a: {} }, 'a.b.c')).toBe(undefined);
      expect(getPathError(null, 'a')).toBe(undefined);
      expect(getPathError({ a: { type: 'validate' } }, 'a')).toBe(undefined);
    });
  });

  describe('rulesFrom', () => {
    it('emits a required message when the field is required', () => {
      const rules = rulesFrom({
        name: 'title',
        label: 'Title',
        required: true,
      } as unknown as Parameters<typeof rulesFrom>[0]);
      expect(rules.required).toBe('Title is required');
    });

    it('emits min/max for number fields', () => {
      const rules = rulesFrom({
        name: 'price',
        label: 'Price',
        uiType: 'number',
        rule: { min: 1, max: 10 },
      } as unknown as Parameters<typeof rulesFrom>[0]);
      expect(rules.min).toEqual({ value: 1, message: 'Min 1' });
      expect(rules.max).toEqual({ value: 10, message: 'Max 10' });
    });
  });

  describe('mergeUniqueUrls', () => {
    it('dedupes while preserving first-seen order and caps at maxItems', () => {
      expect(mergeUniqueUrls(['a'], ['b', 'a', 'c'], 2)).toEqual(['a', 'b']);
    });

    it('drops blank current entries and keeps everything without maxItems', () => {
      expect(mergeUniqueUrls(['', 'a'], ['b'])).toEqual(['a', 'b']);
    });
  });

  describe('takeSingleUrl', () => {
    it('keeps only the newest pick and stays empty for empty input', () => {
      expect(takeSingleUrl(['n1', 'n2'])).toEqual(['n1']);
      expect(takeSingleUrl([])).toEqual([]);
    });
  });
});

describe('gap 1: dropzone accept is derived from field.rule.accept, not hardcoded', () => {
  const renderMulti = (accept?: string[]) =>
    render(
      <MultiImageGrid
        previews={[]}
        files={[]}
        maxItems={4}
        isUploading={false}
        accept={accept}
        onReplaceFile={() => {}}
        onRemoveFile={() => {}}
        onAddFiles={() => {}}
        fileInputs={{ current: [] as Array<HTMLInputElement | null> }}
      />,
    );

  it('joins the rule MIME list for the multi-image grid input', () => {
    renderMulti(['image/png', 'image/webp']);
    expect(screen.getByTestId('main-image-upload-input').getAttribute('accept')).toBe(
      'image/png,image/webp',
    );
  });

  it('keeps image/* only as the fallback when the field rule has no accept', () => {
    renderMulti(undefined);
    expect(screen.getByTestId('main-image-upload-input').getAttribute('accept')).toBe(
      FALLBACK_ACCEPT,
    );
    expect(resolveAcceptAttr([])).toBe(FALLBACK_ACCEPT);
  });

  it('applies the same rule to the single-cover dropzone input', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SingleCoverDropzone
          preview={undefined}
          isUploading={false}
          accept={['image/jpeg']}
          onReplaceFile={() => {}}
          onRemoveFile={() => {}}
          onAddFiles={() => {}}
          handlePickerSelect={() => {}}
          fileInputs={{ current: [] as Array<HTMLInputElement | null> }}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('main-image-upload-input').getAttribute('accept')).toBe('image/jpeg');
  });

  it('narrows the API rule bag down to a MIME list', () => {
    expect(asAcceptList(['image/png', 7, 'image/webp'])).toEqual(['image/png', 'image/webp']);
    expect(asAcceptList(undefined)).toBe(undefined);
    expect(asAcceptList('image/png')).toBe(undefined);
  });
});

describe('gap 2: client type checks reject extension/MIME disagreement', () => {
  it('rejects a .jpg file declared as image/png, naming the file', () => {
    const spoofed = new File(['MZ binaries are not png'], 'evil.jpg', { type: 'image/png' });
    // The browser cannot read magic bytes; the server does (storage.service
    // detectMimeFromMagicBytes). The one thing the client CAN check is that the
    // declared type and the extension describe the same format.
    expect(validateFileBasics(spoofed, { accept: ['image/png'] })).toMatch(/evil\.jpg/);
  });

  it('rejects a .png file declared as image/jpeg', () => {
    const spoofed = new File(['x'], 'shot.png', { type: 'image/jpeg' });
    expect(validateFileBasics(spoofed, { accept: ['image/jpeg'] })).toMatch(/shot\.png/);
  });

  it('accepts agreeing extension+MIME pairs and defers unknown extensions', () => {
    expect(validateFileBasics(pngFile('fine.png'), { accept: ['image/png'] })).toBe(null);
    const unknownExt = new File(['x'], 'photo.heic', { type: 'image/heic' });
    expect(validateFileBasics(unknownExt, { accept: ['image/heic'] })).toBe(null);
  });
});

describe('gap 7: per-file upload outcomes preserve identity', () => {
  it('reports one outcome per file in input order, keeping the File instance', async () => {
    const a = pngFile('a.png');
    const b = pngFile('b.png');
    uploadMock
      .mockResolvedValueOnce(['https://cdn/a.webp'])
      .mockRejectedValueOnce(new Error('"b.png" failed to transfer (status 500)'));

    const outcomes = await uploadImageFilesDetailed([a, b]);

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]).toEqual({ file: a, url: 'https://cdn/a.webp' });
    expect(outcomes[1]?.file).toBe(b);
    expect(outcomes[1]?.url).toBeUndefined();
    expect(outcomes[1]?.error?.message).toMatch(/b\.png/);
  });

  it('attaches the file name when the transport rejects with a bare message', async () => {
    const solo = pngFile('solo.png');
    uploadMock.mockRejectedValueOnce(new Error('network down'));

    const [outcome] = await uploadImageFilesDetailed([solo]);

    expect(outcome?.file).toBe(solo);
    expect(outcome?.error?.message).toBe('"solo.png" network down');
  });

  it('surfaces every failing file name through the throwing wrapper', async () => {
    uploadMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['https://cdn/b.webp'])
      .mockResolvedValueOnce([]);
    const error = await uploadImageFiles([
      pngFile('a.png'),
      pngFile('b.png'),
      pngFile('c.png'),
    ]).then(
      () => null,
      (e: unknown) => e,
    );

    const message = uploadErrorMessage(error);
    expect(message).toMatch(/a\.png/);
    expect(message).toMatch(/c\.png/);
    expect(message).not.toMatch(/b\.png/);
  });
});

describe('gap 9: uploads are idempotent per File instance', () => {
  it('shares a single in-flight request for concurrent calls with the same File', async () => {
    const file = pngFile('dup.png');
    let release: (urls: string[]) => void = () => {};
    uploadMock.mockImplementation(
      () =>
        new Promise<string[]>((resolve) => {
          release = resolve;
        }),
    );

    const eager = uploadImageFiles([file]);
    const payloadTime = uploadImageFiles([file]);
    release(['https://cdn/dup.webp']);

    await expect(Promise.all([eager, payloadTime])).resolves.toEqual([
      ['https://cdn/dup.webp'],
      ['https://cdn/dup.webp'],
    ]);
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('releases the dedupe slot after settling so a later retry really re-uploads', async () => {
    const file = pngFile('retry.png');
    uploadMock.mockResolvedValueOnce(['https://cdn/first.webp']);
    await expect(uploadImageFiles([file])).resolves.toEqual(['https://cdn/first.webp']);

    uploadMock.mockResolvedValueOnce(['https://cdn/second.webp']);
    await expect(uploadImageFiles([file])).resolves.toEqual(['https://cdn/second.webp']);
    expect(uploadMock).toHaveBeenCalledTimes(2);
  });

  it('clears the slot after a failure (a retry must not inherit the rejection)', async () => {
    const file = pngFile('fail.png');
    uploadMock.mockRejectedValueOnce(new Error('boom'));
    await expect(uploadImageFiles([file])).rejects.toThrow(/fail\.png/);

    uploadMock.mockResolvedValueOnce(['https://cdn/ok.webp']);
    await expect(uploadImageFiles([file])).resolves.toEqual(['https://cdn/ok.webp']);
  });
});

describe('gap 10: form values are narrowed instead of cast', () => {
  it('keeps Files and URL strings in place', () => {
    const file = pngFile('a.png');
    expect(toImageValues([file, 'https://cdn/b.webp'])).toEqual([file, 'https://cdn/b.webp']);
  });

  it('returns an empty list for non-array values', () => {
    expect(toImageValues(undefined)).toEqual([]);
    expect(toImageValues('https://cdn/b.webp')).toEqual([]);
  });

  it('neutralizes junk entries without shifting preview indexes', () => {
    const file = pngFile('a.png');
    expect(toImageValues([file, undefined, null, 42])).toEqual([file, '', '', '']);
  });
});

describe('gap: cover file-input uses one validated path, not a synthetic lazy wrapper', () => {
  it('forwards the real ChangeEvent so the value reset and add path are shared', () => {
    const onAddFiles = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SingleCoverDropzone
          preview={undefined}
          isUploading={false}
          onReplaceFile={() => {}}
          onRemoveFile={() => {}}
          onAddFiles={onAddFiles}
          handlePickerSelect={() => {}}
          fileInputs={{ current: [] as Array<HTMLInputElement | null> }}
        />
      </QueryClientProvider>,
    );
    const input = screen.getByTestId('main-image-upload-input') as HTMLInputElement;
    const file = new File(['bits'], 'cover.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(onAddFiles).toHaveBeenCalledTimes(1);
    const received = onAddFiles.mock.calls[0]?.[0] as unknown as { target: object };
    // The synthetic `{ target: { files: [f] } }` wrapper is gone, so the
    // `'value' in e.target` reset branch in onAddFiles actually runs.
    expect('value' in received.target).toBe(true);
  });
});
