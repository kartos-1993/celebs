import React from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColorInlineRow } from '../color-inline-row';

/**
 * The library-pick overflow notice used to erase ITSELF.
 *
 * `appendImages` finishes with `trigger(<prefix>.images)`, whose async
 * validation clears that path's error a microtask later. The overflow branch
 * called `setError` synchronously right after it, so the message was the
 * PREVIOUS writer and lost: the seller was left with a silently truncated
 * gallery and no explanation of the images that vanished.
 *
 * Fix: `await trigger(...)` BEFORE `setError`, so the notice is the LAST
 * writer. The file-pick path (`addFiles`) already did this; this pins the
 * library path.
 *
 * The row's reveal gate (`useFieldErrorReveal`, another lane's contract) is
 * opened for this row in every case, so what is under test is the message's
 * SURVIVAL — not whether a pristine row chooses to show errors at all.
 */

vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));

/** The URLs the mocked GALLERY button hands back; set per test. */
let galleryPicks: string[] = [];

/**
 * Two library buttons render in this row, and `maxSelect` cannot tell them
 * apart — with a single free slot the gallery button is handed
 * `Math.max(1, remainingSlots) === 1`, identical to the swatch button's. The
 * swatch button is the only one carrying a `label`, so that is the discriminator.
 */
vi.mock('../../../components/media-library-button', () => ({
  MediaLibraryButton: (props: {
    label?: string;
    onSelect: (urls: string[]) => void | Promise<void>;
  }) => {
    if (props.label) {
      return (
        <button
          type="button"
          data-testid="pick-swatch"
          onClick={() => props.onSelect(['https://cdn.example.com/swatch.jpg'])}
        />
      );
    }
    return (
      <button
        type="button"
        data-testid="pick-gallery"
        onClick={() => props.onSelect(galleryPicks)}
      />
    );
  },
}));

const RED = 'variants.colorMeta.Red';
const MAX = 3;

const url = (n: number) => `https://cdn.example.com/red-${n}.jpg`;

/** RHF `defaultValues` are NESTED, so `variants.colorMeta.Red` is built up. */
const nested = (images: string[]) => ({ variants: { colorMeta: { Red: { images } } } });

function renderRow(defaultImages: string[]) {
  function Harness() {
    const methods = useForm<FieldValues>({
      defaultValues: nested(defaultImages),
      mode: 'onChange' as const,
    });
    return (
      <FormProvider {...methods}>
        <ColorInlineRow color="Red" namePrefix={RED} limits={{ maxImages: MAX }} />
        {/* Opens the reveal gate for this row, the same lever
            `color-row-error-gate.spec.tsx` uses. */}
        <button
          type="button"
          onClick={() =>
            methods.setValue(`${RED}.images`, methods.getValues(`${RED}.images`), {
              shouldTouch: true,
            })
          }
        >
          touch-images
        </button>
      </FormProvider>
    );
  }
  const view = render(<Harness />);
  fireEvent.click(screen.getByText('touch-images'));
  return view;
}

/** The library pick, then the microtask that used to wipe the message. */
const pick = async (urls: string[]) => {
  galleryPicks = urls;
  await act(async () => {
    fireEvent.click(screen.getByTestId('pick-gallery'));
  });
  // The exact microtask boundary the lost message died on.
  await act(async () => {
    await Promise.resolve();
  });
};

const notice = () => screen.queryByText(/images added — Max/);

/** The `n / max` counter: the observable projection of the stored images. */
const counter = () => screen.getByText(new RegExp(`\\d+ / ${MAX}`)).textContent;

beforeEach(() => {
  galleryPicks = [];
});

describe('the library overflow notice must survive the async validation', () => {
  it('stays on screen instead of flashing away', async () => {
    // One free slot, three URLs handed back: one is added, two are dropped.
    renderRow([url(1), url(2)]);
    expect(counter()).toBe('2 / 3');

    await pick([url(3), url(4), url(5)]);

    // The harm this pins: the message used to be gone by now, while the two
    // dropped images were really gone.
    expect(screen.getByText(`Only 1 of 3 images added — Max ${MAX}`)).toBeTruthy();
    expect(notice()).not.toBeNull();
  });

  it('still writes the one image that fit — the notice replaces nothing', async () => {
    renderRow([url(1), url(2)]);

    await pick([url(3), url(4), url(5)]);

    expect(notice()).not.toBeNull();
    expect(counter()).toBe('3 / 3');
  });

  it('names the drop without truncating the count when only some fit', async () => {
    renderRow([url(1)]);

    // Two free slots, three URLs: two added, one dropped.
    await pick([url(3), url(4), url(5)]);

    expect(screen.getByText(`Only 2 of 3 images added — Max ${MAX}`)).toBeTruthy();
    expect(counter()).toBe('3 / 3');
  });

  it('publishes no overflow notice when everything fits', async () => {
    renderRow([url(1)]);
    await pick([url(3), url(4)]);

    expect(counter()).toBe('3 / 3');
    expect(notice()).toBeNull();
  });

  it('offers no gallery library button once every slot is used', async () => {
    renderRow([url(1), url(2), url(3)]);

    expect(counter()).toBe('3 / 3');
    expect(screen.queryByTestId('pick-gallery')).toBeNull();
    expect(screen.getByText(`Max ${MAX} reached`)).toBeTruthy();
  });
});
