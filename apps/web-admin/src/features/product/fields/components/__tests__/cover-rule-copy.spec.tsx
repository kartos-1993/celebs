import React from 'react';
import { type Control, FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductApiService } from '../../../api';
import type { UiProps } from '../../ui-registry';
import { MainImageInputField } from '../main-image-input-field';

vi.mock('../../../api', () => ({ ProductApiService: { uploadFiles: vi.fn() } }));
vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));
// The library picker and the crop dialog own their own network/modal surface;
// neither is under test here.
vi.mock('../../../components/media-library-button', () => ({ MediaLibraryButton: () => null }));
vi.mock('../../../components/media-crop-dialog', () => ({ MediaCropDialog: () => null }));

/**
 * The cover field has to TEACH the rule, not just enforce it.
 *
 * The canonical cover order is `cover = mainImages[0] ?? first colour's first
 * photo` (see `resolveCoverImages` / the API's `resolveCover`). A seller who
 * uploads a shared gallery AND per-colour galleries has to be able to predict
 * which one wins — otherwise they upload a shared cover, see a different photo
 * on the storefront, and cannot tell why.
 */

const uploadMock = vi.mocked(ProductApiService.uploadFiles);

const field = (spec: Record<string, unknown>) => spec as unknown as UiProps['field'];

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

/** The cover field registered under the one canonical name, `mainImages`. */
const COVER_FIELD = field({
  name: 'mainImages',
  label: 'Cover Images',
  group: 'base',
  rule: { maxSize: 5242880 },
});

function renderCoverField() {
  render(
    <Harness defaults={{ mainImages: [] }}>
      {(control) => <MainImageInputField field={COVER_FIELD} control={control} />}
    </Harness>,
  );
}

beforeEach(() => {
  let seq = 0;
  URL.createObjectURL = ((_obj: unknown) =>
    `blob:mock-${seq++}`) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as unknown as typeof URL.revokeObjectURL;
  uploadMock.mockReset();
  uploadMock.mockResolvedValue([]);
});

describe('the cover field states the cover rule', () => {
  it('says the first shared image is the cover', () => {
    renderCoverField();

    expect(screen.getByText(/shared gallery for every colour/i)).toBeTruthy();
    expect(screen.getByText(/the first image here is the product cover/i)).toBeTruthy();
  });

  it('says an empty field falls back to the first colour photo', () => {
    renderCoverField();

    expect(screen.getByText(/leave it empty to use the first colour photo instead/i)).toBeTruthy();
  });

  it('says a per-colour gallery does not override the shared cover', () => {
    renderCoverField();

    expect(screen.getByText(/per-colour galleries never override it/i)).toBeTruthy();
  });
});
