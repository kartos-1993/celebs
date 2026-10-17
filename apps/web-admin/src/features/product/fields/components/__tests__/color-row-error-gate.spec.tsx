import React from 'react';
import {
  type Control,
  type FieldValues,
  FormProvider,
  useForm,
  useFormState,
} from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ColorInlineRow } from '../color-inline-row';
import { ColorMetaItem } from '../color-meta-item';
import { getPathError } from '../shared-utils';

vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));
vi.mock('../../../components/media-library-button', () => ({ MediaLibraryButton: () => null }));

const RED = 'variants.colorMeta.Red';
const BLUE = 'variants.colorMeta.Blue';
const RED_IMAGES = `${RED}.images`;
const RED_SWATCH = `${RED}.swatch`;
const BLUE_IMAGES = `${BLUE}.images`;

const IMAGES_MSG = 'Upload at least one product image for Red';
const SWATCH_MSG = 'Swatch must be <= 5MB';
const BLUE_MSG = 'Upload at least one product image for Blue';

type RowKind = 'inline' | 'meta';

function RowHarness({ children }: { children: React.ReactNode }) {
  const methods = useForm<FieldValues>({ defaultValues: {}, mode: 'onChange' as const });
  return (
    <form>
      <FormProvider {...methods}>
        <Probe control={methods.control} />
        {children}
        <button
          type="button"
          onClick={() => methods.setError(RED_IMAGES, { type: 'validate', message: IMAGES_MSG })}
        >
          mark-red-images
        </button>
        <button
          type="button"
          onClick={() => methods.setError(RED_SWATCH, { type: 'validate', message: SWATCH_MSG })}
        >
          mark-red-swatch
        </button>
        <button
          type="button"
          onClick={() => methods.setError(BLUE_IMAGES, { type: 'validate', message: BLUE_MSG })}
        >
          mark-blue-images
        </button>
        <button
          type="button"
          onClick={() => methods.setValue(RED_IMAGES, [], { shouldTouch: true })}
        >
          touch-red-images
        </button>
        <button
          type="button"
          onClick={() => methods.setValue(RED_SWATCH, null, { shouldTouch: true })}
        >
          touch-red-swatch
        </button>
        <button
          type="button"
          onClick={() => methods.setValue(BLUE_IMAGES, [], { shouldTouch: true })}
        >
          touch-blue-images
        </button>
        <button type="button" onClick={() => methods.handleSubmit(() => undefined)()}>
          submit
        </button>
      </FormProvider>
    </form>
  );
}

function Probe({ control }: { control: Control<FieldValues> }) {
  const { errors } = useFormState({ control });
  return (
    <>
      {[RED_IMAGES, RED_SWATCH, BLUE_IMAGES].map((path) => (
        <span
          key={path}
          data-testid={`rhf-${path}`}
          data-message={String(getPathError(errors, path)?.message ?? '')}
        />
      ))}
    </>
  );
}

function renderRows(kind: RowKind) {
  return render(
    <RowHarness>
      {kind === 'inline' ? (
        <>
          <ColorInlineRow color="Red" namePrefix={RED} />
          <ColorInlineRow color="Blue" namePrefix={BLUE} />
        </>
      ) : (
        <>
          <ColorMetaItem color="Red" namePrefix={RED} />
          <ColorMetaItem color="Blue" namePrefix={BLUE} />
        </>
      )}
    </RowHarness>,
  );
}

const KINDS: Array<[RowKind, string]> = [
  ['inline', 'color-inline-row'],
  ['meta', 'color-meta-item'],
];

describe.each(KINDS)('inline gate — %s', (kind) => {
  it('shows nothing on a pristine colour table', () => {
    renderRows(kind);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stays silent when every row already holds a failing error nobody touched', async () => {
    renderRows(kind);
    fireEvent.click(screen.getByText('mark-red-images'));
    fireEvent.click(screen.getByText('mark-red-swatch'));
    fireEvent.click(screen.getByText('mark-blue-images'));
    await waitFor(() =>
      expect(screen.getByTestId(`rhf-${RED_IMAGES}`).dataset.message).toBe(IMAGES_MSG),
    );
    expect(screen.queryByText(IMAGES_MSG)).toBeNull();
    expect(screen.queryByText(SWATCH_MSG)).toBeNull();
    expect(screen.queryByText(BLUE_MSG)).toBeNull();
  });

  it('reveals only the row that was touched — Blue stays silent while Red is worked on', async () => {
    renderRows(kind);
    fireEvent.click(screen.getByText('mark-red-images'));
    fireEvent.click(screen.getByText('mark-red-swatch'));
    fireEvent.click(screen.getByText('mark-blue-images'));
    fireEvent.click(screen.getByText('touch-red-images'));
    expect(await screen.findByText(IMAGES_MSG)).toBeTruthy();
    expect(screen.queryByText(BLUE_MSG)).toBeNull();
  });

  it('the gallery complaint wins over the swatch complaint inside the same row', async () => {
    renderRows(kind);
    fireEvent.click(screen.getByText('mark-red-swatch'));
    fireEvent.click(screen.getByText('mark-red-images'));
    fireEvent.click(screen.getByText('touch-red-images'));
    expect(await screen.findByText(IMAGES_MSG)).toBeTruthy();
    expect(screen.queryByText(SWATCH_MSG)).toBeNull();
  });

  it('touching the swatch path alone surfaces the swatch complaint only', async () => {
    renderRows(kind);
    fireEvent.click(screen.getByText('mark-red-swatch'));
    fireEvent.click(screen.getByText('mark-red-images'));
    fireEvent.click(screen.getByText('touch-red-swatch'));
    expect(await screen.findByText(SWATCH_MSG)).toBeTruthy();
    expect(screen.queryByText(IMAGES_MSG)).toBeNull();
  });

  it('reveals every row once a submit has been attempted', async () => {
    renderRows(kind);
    fireEvent.click(screen.getByText('submit'));
    fireEvent.click(screen.getByText('mark-red-images'));
    fireEvent.click(screen.getByText('mark-blue-images'));
    expect(await screen.findByText(IMAGES_MSG)).toBeTruthy();
    expect(await screen.findByText(BLUE_MSG)).toBeTruthy();
  });
});
