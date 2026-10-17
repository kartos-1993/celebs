import React from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { collectCoverError } from '../../../utils/add-product-validation';
import type { UiProps } from '../../ui-registry';
import { useMainImageState } from '../use-main-image-state';

vi.mock('../../../api', () => ({ ProductApiService: { uploadFiles: vi.fn() } }));
vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));

const COVER = 'mainImage';

type CoverForm = {
  mainImage: string[];
  variants?: { colorMeta?: Record<string, { images?: string[] }> };
};

let formApi: {
  trigger: (name: string) => Promise<boolean>;
  getFieldState: (name: string) => { error?: { message?: string } };
} | null = null;

const coverField = (required: boolean) =>
  ({
    name: COVER,
    uiType: 'MainImage',
    label: 'Main Product Image',
    group: 'media',
    required,
    rule: { maxItems: 5 },
  }) as unknown as UiProps['field'];

beforeEach(() => {
  formApi = null;
  URL.createObjectURL = ((_obj: unknown) => 'blob:mock') as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as unknown as typeof URL.revokeObjectURL;
});

/**
 * Mounts the hook over `initial`, then asks RHF to run the rule the hook
 * registered — the same entry point the submit path uses, so this exercises
 * the live rule rather than a copy of it.
 */
async function runCoverRule(
  field: UiProps['field'],
  initial: Partial<CoverForm>,
): Promise<string | undefined> {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm<FieldValues>({ defaultValues: initial as FieldValues });
    formApi = {
      trigger: (name) => methods.trigger(name),
      getFieldState: (name) => methods.getFieldState(name),
    };
    return <FormProvider {...methods}>{children}</FormProvider>;
  }
  renderHook(() => useMainImageState({ field }), { wrapper: Wrapper });
  const api = formApi;
  if (!api) throw new Error('form was never mounted');
  await act(async () => {
    await api.trigger(COVER);
  });
  return api.getFieldState(COVER).error?.message;
}

describe('cover required rule honours field.required and the colour-gallery fallback', () => {
  it('required + no cover + no galleries → the cover is demanded', async () => {
    expect(await runCoverRule(coverField(true), { mainImage: [] })).toBe(
      'Main Product Image is required',
    );
  });

  it('required + full colour galleries + no cover → NO error', async () => {
    // The bug: this product HAS a cover (the Red gallery photo) yet the field
    // kept a permanent "Main Product Image is required".
    expect(
      await runCoverRule(coverField(true), {
        mainImage: [],
        variants: { colorMeta: { Red: { images: ['https://cdn/red-1.webp'] } } },
      }),
    ).toBeUndefined();
  });

  it('required + a cover present → no error', async () => {
    expect(
      await runCoverRule(coverField(true), { mainImage: ['https://cdn/cover.webp'] }),
    ).toBeUndefined();
  });

  it('not required + no cover + no galleries → no error', async () => {
    expect(await runCoverRule(coverField(false), { mainImage: [] })).toBeUndefined();
  });

  it('a maxItems overflow is still reported — only the required branch defers to galleries', async () => {
    const overflowField = {
      ...coverField(true),
      rule: { maxItems: 1 },
    } as unknown as UiProps['field'];
    expect(
      await runCoverRule(overflowField, {
        mainImage: ['https://cdn/a.webp', 'https://cdn/b.webp'],
      }),
    ).toBe('Max 1 images');
  });
});

describe('the field rule and collectCoverError agree', () => {
  it('accepts a full colour gallery exactly as the submit-time collector does', () => {
    const withGallery = { mainImage: [], variants: { colorMeta: { Red: { images: ['u'] } } } };
    expect(collectCoverError({ values: withGallery, schemaFields: [coverField(true)] })).toEqual(
      [],
    );
  });

  it('rejects an empty product exactly as the submit-time collector does', () => {
    expect(
      collectCoverError({ values: { mainImage: [] }, schemaFields: [coverField(true)] }),
    ).toHaveLength(1);
  });
});
