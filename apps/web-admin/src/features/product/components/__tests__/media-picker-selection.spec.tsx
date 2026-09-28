import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaAsset } from '@celebs/shared-types';

import { MediaPickerDialog } from '../media-picker-dialog';

vi.mock('../../hooks/use-media-assets', () => ({
  useInvalidateMediaLibrary: () => vi.fn(),
  useMediaAssets: () => ({ data: { items: assets }, isLoading: false }),
  useMediaQuota: () => ({ data: undefined }),
}));
vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }));
vi.mock('@/lib/media-upload', () => ({ directUploadBatch: vi.fn() }));

const assets: MediaAsset[] = [
  { id: 'a1', url: 'https://cdn.example.com/1.jpg', originalName: 'red.jpg' },
  { id: 'a2', url: 'https://cdn.example.com/2.jpg', originalName: 'blue.jpg' },
] as MediaAsset[];

let queryClient: QueryClient;
const onSelect = vi.fn();
const onOpenChange = vi.fn();

const SEED = ['https://cdn.example.com/1.jpg'];

/**
 * A parent that rebuilds `initialSelectedUrls` on every render — exactly what
 * `main-image-input-field.tsx:41` does with `state.previews.filter(...)`. The
 * ARRAY identity is new every time; only its CONTENTS are stable. `rerender`
 * with a fresh literal reproduces that for one frame of the dialog's life.
 */
function Host({ initialSelectedUrls }: { initialSelectedUrls: string[] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MediaPickerDialog
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        maxSelect={4}
        initialSelectedUrls={initialSelectedUrls}
      />
    </QueryClientProvider>
  );
}

function mount() {
  return render(<Host initialSelectedUrls={[...SEED]} />);
}

/** One parent re-render with a brand-new array holding the SAME contents. */
const bumpParent = (view: { rerender: (ui: React.ReactElement) => void }) =>
  view.rerender(<Host initialSelectedUrls={[...SEED]} />);

/** The footer count is the observable projection of `selectedUrls`. */
const selectedCount = () => screen.getByText(/images? selected/).textContent;
const tickBlue = () => fireEvent.click(screen.getByTitle('blue.jpg'));

beforeEach(() => {
  onSelect.mockClear();
  onOpenChange.mockClear();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('a re-render must not wipe the seller selection mid-pick', () => {
  it('keeps ticked images selected after the parent re-renders', () => {
    // Regression: the seed effect depended on the `initialSelectedUrls` ARRAY,
    // which every call site rebuilds inline, so any parent re-render re-seeded
    // the selection and snapped the tick back off.
    const view = mount();
    expect(selectedCount()).toContain('1 image selected');

    tickBlue();
    expect(selectedCount()).toContain('2 images selected');

    bumpParent(view);
    expect(selectedCount()).toContain('2 images selected');
    expect(screen.getByTitle('blue.jpg').getAttribute('aria-pressed')).toBe('true');

    bumpParent(view);
    expect(selectedCount()).toContain('2 images selected');
  });

  it('confirms the live selection, not the seeded one', () => {
    const view = mount();
    tickBlue();
    bumpParent(view);

    fireEvent.click(screen.getByRole('button', { name: /^Insert/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual([
      'https://cdn.example.com/1.jpg',
      'https://cdn.example.com/2.jpg',
    ]);
  });
});
