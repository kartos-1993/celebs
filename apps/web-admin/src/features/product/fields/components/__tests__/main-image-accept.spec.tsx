import React from 'react';
import { type Control, FormProvider, useForm } from 'react-hook-form';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductApiService } from '../../../api';
import type { UiProps } from '../../ui-registry';
import { MainImageInputField } from '../main-image-input-field';

vi.mock('../../../api', () => ({ ProductApiService: { uploadFiles: vi.fn() } }));
vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));
// The library picker and the crop dialog own their own network/modal surface;
// neither is under test here.
vi.mock('../../../components/media-library-button', () => ({
  MediaLibraryButton: () => null,
}));
vi.mock('../../../components/media-crop-dialog', () => ({ MediaCropDialog: () => null }));

const uploadMock = vi.mocked(ProductApiService.uploadFiles);

function Harness({
  defaults,
  children,
}: {
  defaults: Record<string, unknown>;
  children: (control: Control) => React.ReactNode;
}) {
  const methods = useForm({ defaultValues: defaults });
  return <FormProvider {...methods}>{children(methods.control)}</FormProvider>;
}

const field = (spec: Record<string, unknown>) => spec as unknown as UiProps['field'];

function renderCover(rule?: Record<string, unknown>) {
  render(
    <Harness defaults={{ mainImage: [] }}>
      {(control) => (
        <MainImageInputField
          field={field({
            name: 'mainImage',
            label: 'Product Images',
            rule,
            dataSource: { maxItems: 1 },
          })}
          control={control}
        />
      )}
    </Harness>,
  );
  const input = document.querySelector<HTMLInputElement>('[data-testid="main-image-upload-input"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

/** maxItems > 1 renders the multi-image grid, which has its own file input. */
function renderGallery(rule: Record<string, unknown>) {
  render(
    <Harness defaults={{ mainImage: [] }}>
      {(control) => (
        <MainImageInputField
          field={field({
            name: 'mainImage',
            label: 'Product Images',
            rule,
            dataSource: { maxItems: 4 },
          })}
          control={control}
        />
      )}
    </Harness>,
  );
  const input = document.querySelector<HTMLInputElement>('[data-testid="main-image-upload-input"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

beforeEach(() => {
  let seq = 0;
  URL.createObjectURL = ((_obj: unknown) =>
    `blob:mock-${seq++}`) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as unknown as typeof URL.revokeObjectURL;
  uploadMock.mockReset();
  uploadMock.mockResolvedValue([]);
});

describe('main image field: rule.accept reaches the dropzone input', () => {
  it('renders the field rule allowlist as the file input accept attribute', () => {
    const input = renderCover({ accept: ['image/jpeg', 'image/png'], maxSize: 5242880 });
    expect(input.getAttribute('accept')).toBe('image/jpeg,image/png');
  });

  it('falls back to image/* only when the field carries no accept rule', () => {
    expect(renderCover({ maxSize: 5242880 }).getAttribute('accept')).toBe('image/*');
    expect(renderCover(undefined).getAttribute('accept')).toBe('image/*');
  });

  it('ignores a non-array rule.accept instead of trusting it', () => {
    expect(renderCover({ accept: 'image/png' }).getAttribute('accept')).toBe('image/*');
  });

  it('renders the allowlist on the multi-image grid input too', () => {
    const input = renderGallery({ accept: ['image/webp'], maxSize: 1048576, maxItems: 4 });
    expect(input.getAttribute('accept')).toBe('image/webp');
    expect(input.hasAttribute('multiple')).toBe(true);
  });
});
