import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductApiService } from '../../../api';
import type { UiProps } from '../../ui-registry';
import { useMainImageState } from '../use-main-image-state';

vi.mock('../../../api', () => ({ ProductApiService: { uploadFiles: vi.fn() } }));
vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));

const uploadMock = vi.mocked(ProductApiService.uploadFiles);

type CoverForm = { cover: string[] };

let formApi: {
  getValues: (name: 'cover') => string[];
  getFieldState: (name: 'cover') => { error?: { message?: string } };
} | null = null;

function makeWrapper(initial: string[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm<CoverForm>({ defaultValues: { cover: initial } });
    formApi = {
      getValues: (name: 'cover') => methods.getValues(name),
      getFieldState: (name: 'cover') => methods.getFieldState(name),
    };
    return <FormProvider {...methods}>{children}</FormProvider>;
  };
}

const fieldWith = (rule: Record<string, unknown>) =>
  ({
    name: 'cover',
    label: 'Cover',
    rule,
  }) as unknown as UiProps['field'];

// jsdom never fires <img> onload and has no URL.createObjectURL: stub both so
// dimension checks and preview effects resolve deterministically.
const imageDims = { w: 800, h: 1000 };

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = imageDims.w;
  naturalHeight = imageDims.h;
  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

/** Never fires load or error: only the probe timeout can settle it. */
class SilentImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  set src(_value: string) {
    /* never settles */
  }
}

beforeEach(() => {
  formApi = null;
  imageDims.w = 800;
  imageDims.h = 1000;
  let seq = 0;
  URL.createObjectURL = ((_obj: unknown) =>
    `blob:mock-${seq++}`) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as unknown as typeof URL.revokeObjectURL;
  vi.stubGlobal('Image', MockImage);
  uploadMock.mockReset();
  uploadMock.mockResolvedValue(['https://cdn/uploaded.webp']);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const selectableFile = (name: string) => new File(['x'.repeat(100)], name, { type: 'image/png' });

describe('useMainImageState', () => {
  it('derives maxItems/isSingle from field.rule, defaulting to a single cover', () => {
    const multi = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 3 }) }), {
      wrapper: makeWrapper([]),
    });
    expect(multi.result.current.maxItems).toBe(3);
    expect(multi.result.current.isSingle).toBe(false);

    const single = renderHook(() => useMainImageState({ field: fieldWith({}) }), {
      wrapper: makeWrapper([]),
    });
    expect(single.result.current.maxItems).toBe(1);
    expect(single.result.current.isSingle).toBe(true);
  });

  it('handlePickerSelect merges, dedupes and truncates to maxItems', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 2 }) }), {
      wrapper: makeWrapper(['https://cdn/a.webp']),
    });
    await act(async () => {
      result.current.handlePickerSelect([
        'https://cdn/b.webp',
        'https://cdn/a.webp',
        'https://cdn/c.webp',
      ]);
    });
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/a.webp', 'https://cdn/b.webp']);
  });

  it('single mode replaces the cover with the first picked url', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 1 }) }), {
      wrapper: makeWrapper(['https://cdn/old.webp']),
    });
    await act(async () => {
      result.current.handlePickerSelect(['https://cdn/n1.webp', 'https://cdn/n2.webp']);
    });
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/n1.webp']);
  });

  it('onRemoveFile drops the indexed entry', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 3 }) }), {
      wrapper: makeWrapper(['a', 'b']),
    });
    await act(async () => {
      result.current.onRemoveFile(0);
    });
    expect(formApi?.getValues('cover')).toEqual(['b']);
  });
});

describe('gap 3: library/URL picks are validated like file picks', () => {
  it('rejects a non-URL pick with a per-pick error', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 2 }) }), {
      wrapper: makeWrapper([]),
    });
    await act(async () => {
      await result.current.handlePickerSelect(['not-a-valid-url']);
    });
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/not-a-valid-url/);
    expect(formApi?.getValues('cover')).toEqual([]);
  });

  it('rejects a URL whose extension is outside the field accept list', async () => {
    const { result } = renderHook(
      () => useMainImageState({ field: fieldWith({ maxItems: 2, accept: ['image/png'] }) }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.handlePickerSelect(['https://cdn/x.jpg']);
    });
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/x\.jpg/);
    expect(formApi?.getValues('cover')).toEqual([]);
  });

  it('defers a URL with an unknown extension to the server (no client signal)', async () => {
    const { result } = renderHook(
      () => useMainImageState({ field: fieldWith({ maxItems: 2, accept: ['image/png'] }) }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.handlePickerSelect(['https://cdn/x.zzz']);
    });
    expect(formApi?.getFieldState('cover').error).toBeUndefined();
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/x.zzz']);
  });

  it('accepts a conforming library URL and stores it', async () => {
    const { result } = renderHook(
      () => useMainImageState({ field: fieldWith({ maxItems: 2, accept: ['image/png'] }) }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.handlePickerSelect(['https://cdn/x.png']);
    });
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/x.png']);
  });

  it('fails closed when a ruled image cannot be decoded, naming the URL', async () => {
    // SilentImage never fires onload/onerror, so only probeImageDimensions'
    // timeout can settle this — a silent pass is the bug being pinned.
    vi.stubGlobal('Image', SilentImage);
    const { result } = renderHook(
      () => useMainImageState({ field: fieldWith({ maxItems: 2, minWidth: 100 }) }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.handlePickerSelect(['https://cdn/slow.png']);
    });
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/slow\.png/);
    expect(formApi?.getValues('cover')).toEqual([]);
  }, 20000);

  it('reports over-limit library picks instead of silently truncating', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 1 }) }), {
      wrapper: makeWrapper([]),
    });
    await act(async () => {
      await result.current.handlePickerSelect(['https://cdn/a.png', 'https://cdn/b.png']);
    });
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/b\.png/);
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/a.png']);
  });
});

describe('gap 4: cropped output is re-checked before upload', () => {
  it('blocks the upload and reports the error when the crop exceeds maxSize', async () => {
    imageDims.w = 100;
    imageDims.h = 1000; // ratio 0.1 -> forces the crop branch
    const { result } = renderHook(
      () =>
        useMainImageState({
          field: fieldWith({ maxItems: 2, maxSize: 5 * 1024 * 1024 }),
        }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.onAddFiles({ target: { files: [selectableFile('ok.png')] } });
    });
    expect(result.current.croppingFile).not.toBeNull();

    const oversizedCrop = new File(['x'.repeat(6 * 1024 * 1024)], 'crop.webp', {
      type: 'image/webp',
    });
    uploadMock.mockClear();
    await act(async () => {
      await result.current.handleCropComplete(oversizedCrop);
    });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/crop\.webp/);
    expect(result.current.croppingFile).toBeNull();
  });

  it('blocks the upload when the crop re-encodes to a type outside the accept list', async () => {
    imageDims.w = 100;
    imageDims.h = 1000;
    const { result } = renderHook(
      () => useMainImageState({ field: fieldWith({ maxItems: 2, accept: ['image/jpeg'] }) }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.onAddFiles({ target: { files: [selectableFile('ok.png')] } });
    });

    uploadMock.mockClear();
    await act(async () => {
      await result.current.handleCropComplete(
        new File(['x'.repeat(64)], 'crop.webp', { type: 'image/webp' }),
      );
    });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(formApi?.getFieldState('cover').error?.message).toBeTruthy();
  });

  it('still uploads a conforming crop', async () => {
    imageDims.w = 100;
    imageDims.h = 1000;
    const { result } = renderHook(
      () =>
        useMainImageState({
          field: fieldWith({ maxItems: 2, maxSize: 5 * 1024 * 1024 }),
        }),
      { wrapper: makeWrapper([]) },
    );
    await act(async () => {
      await result.current.onAddFiles({ target: { files: [selectableFile('ok.png')] } });
    });

    uploadMock.mockClear();
    await act(async () => {
      await result.current.handleCropComplete(
        new File(['x'.repeat(64)], 'crop.webp', { type: 'image/webp' }),
      );
    });
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/uploaded.webp']);
  });
});

describe('gap 5: over-limit truncation names the dropped files', () => {
  it('reports the dropped file identity for file picks', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 2 }) }), {
      wrapper: makeWrapper([]),
    });
    uploadMock.mockResolvedValue(['u1', 'u2']);
    await act(async () => {
      await result.current.onAddFiles({
        target: {
          files: [selectableFile('a.png'), selectableFile('b.png'), selectableFile('c.png')],
        },
      });
    });
    expect(formApi?.getFieldState('cover').error?.message ?? '').toContain('c.png');
  });

  it('refuses the whole pick when the gallery is already full', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 1 }) }), {
      wrapper: makeWrapper(['https://cdn/a.webp']),
    });
    await act(async () => {
      await result.current.onAddFiles({ target: { files: [selectableFile('b.png')] } });
    });
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/Maximum allowed is 1/);
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/a.webp']);
  });
});

describe('gap 6: replaceAt respects remaining slots', () => {
  it('ignores an out-of-range index instead of writing a sparse array', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 1 }) }), {
      wrapper: makeWrapper(['https://cdn/only.webp']),
    });
    await act(async () => {
      await result.current.onReplaceFile(5, selectableFile('new.png'));
    });
    expect(formApi?.getValues('cover') ?? []).toHaveLength(1);
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/position 5/);
  });

  it('replaces in place for a valid index', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 2 }) }), {
      wrapper: makeWrapper(['https://cdn/a.webp']),
    });
    await act(async () => {
      await result.current.onReplaceFile(0, selectableFile('new.png'));
    });
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/uploaded.webp']);
  });

  it('rejects a negative index', async () => {
    const { result } = renderHook(() => useMainImageState({ field: fieldWith({ maxItems: 2 }) }), {
      wrapper: makeWrapper(['https://cdn/a.webp']),
    });
    await act(async () => {
      await result.current.onReplaceFile(-1, selectableFile('new.png'));
    });
    expect(formApi?.getValues('cover')).toEqual(['https://cdn/a.webp']);
    expect(formApi?.getFieldState('cover').error?.message).toMatch(/position -1/);
  });
});
