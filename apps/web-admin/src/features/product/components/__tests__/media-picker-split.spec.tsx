import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaAsset } from '@celebs/shared-types';

import { MediaPickerDialog } from '../media-picker-dialog';

/**
 * The media picker was decomposed (AGENTS §4: a 189-line `.tsx` is over the
 * 150-line budget, and §11 forbids appending patch code to a bloated file) into
 * `useMediaPickerState` (logic), `MediaPickerTabBar` (the strip) and a
 * layout-only dialog.
 *
 * A decomposition that changes behaviour is a refactor nobody asked for, so this
 * pins the two extracted surfaces that the old monolithic file owned and that no
 * other spec covered: the tab strip's limit notice, and the direct-upload path.
 */

vi.mock('../../hooks/use-media-assets', () => ({
  useInvalidateMediaLibrary: () => vi.fn(),
  useMediaAssets: () => ({ data: { items: [] }, isLoading: false }),
  useMediaQuota: () => ({ data: undefined }),
}));
vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }));
vi.mock('@/lib/media-upload', () => ({ directUploadBatch: vi.fn() }));

const { directUploadBatch } = await import('@/lib/media-upload');
const upload = vi.mocked(directUploadBatch);

const url = (n: number) => `https://cdn.example.com/new-${n}.jpg`;

let queryClient: QueryClient;

function mount(props: Partial<React.ComponentProps<typeof MediaPickerDialog>> = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MediaPickerDialog
        open
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
        maxSelect={2}
        initialSelectedUrls={[]}
        {...props}
      />
    </QueryClientProvider>,
  );
}

/** The file input the upload tab hides behind its Browse Files label. */
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

/**
 * jsdom has no `DataTransfer`, and the upload tab only ever calls
 * `Array.from(files)` and `files.length` on the list, so a plain array is an
 * exact stand-in for the production contract under test.
 */
const files = (count: number) =>
  Array.from({ length: count }, (_, i) => new File(['x'], `p${i + 1}.png`)) as unknown as FileList;

const selectedCount = () => screen.getByText(/images? selected/).textContent;

/**
 * Radix  activates on mousedown, not click, so a bare
 * `fireEvent.click` silently does nothing. `userEvent.click` sends the real
 * pointer sequence.
 */
const clickTab = (name: string) => userEvent.click(screen.getByRole('tab', { name }));

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('the extracted tab strip keeps the limit notice exactly as it was', () => {
  it('appears once the selection reaches the cap, with the same copy', () => {
    mount({ maxSelect: 2, initialSelectedUrls: [url(1), url(2)] });
    expect(screen.getByText('Selection limit reached (2)')).toBeTruthy();
  });

  it('does not appear below the cap', () => {
    mount({ maxSelect: 2, initialSelectedUrls: [url(1)] });
    expect(screen.queryByText(/Selection limit reached/)).toBeNull();
  });

  it('is suppressed on the upload tab, where there is no grid to limit', async () => {
    mount({ maxSelect: 2, initialSelectedUrls: [url(1), url(2)] });
    expect(screen.getByText('Selection limit reached (2)')).toBeTruthy();

    await clickTab('Upload New');

    await waitFor(() => expect(screen.queryByText(/Selection limit reached/)).toBeNull());
  });

  it('keeps both tabs reachable by name', () => {
    mount();
    expect(screen.getByRole('tab', { name: 'Library' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Upload New' })).toBeTruthy();
  });
});

describe('the extracted upload path keeps its cap, tab switch, and error surface', () => {
  it('adds the uploaded images and returns to the library tab', async () => {
    upload.mockResolvedValue([url(1), url(2)]);
    mount({ maxSelect: 4 });

    await clickTab('Upload New');
    fireEvent.change(fileInput(), { target: { files: files(2) } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(upload).toHaveBeenCalledWith(expect.anything(), 'celebs/products', 'PRODUCT');
    await waitFor(() => expect(selectedCount()).toContain('2 images selected'));
    // The successful-upload hand-off to the library grid is the whole reason
    // the tab switches; the new images have to be visible to be inserted.
    expect(screen.getByRole('tab', { name: 'Library' }).getAttribute('aria-selected')).toBe('true');
  });

  it('hard-caps the selection at maxSelect even when more are uploaded', async () => {
    upload.mockResolvedValue([url(1), url(2), url(3), url(4)]);
    mount({ maxSelect: 2 });

    await clickTab('Upload New');
    fireEvent.change(fileInput(), { target: { files: files(4) } });

    await waitFor(() => expect(selectedCount()).toContain('2 images selected'));
  });

  it('surfaces a failed upload and keeps the selection untouched', async () => {
    upload.mockRejectedValue(new Error('Storage quota exceeded'));
    mount({ maxSelect: 4, initialSelectedUrls: [url(1)] });

    await clickTab('Upload New');
    fireEvent.change(fileInput(), { target: { files: files(1) } });

    expect(await screen.findByText('Storage quota exceeded')).toBeTruthy();
    expect(selectedCount()).toContain('1 image selected');
  });

  it('uses the documented non-Error fallback message', async () => {
    upload.mockRejectedValue('nope');
    mount();

    await clickTab('Upload New');
    fireEvent.change(fileInput(), { target: { files: files(1) } });

    expect(await screen.findByText('Failed to upload images')).toBeTruthy();
  });

  it('does nothing at all for an empty file selection', async () => {
    mount();
    await clickTab('Upload New');
    fireEvent.change(fileInput(), { target: { files: files(0) } });
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('the split kept the component identity and confirm contract', () => {
  it('confirms the live selection and closes', () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    const assets = [{ id: 'a1', url: url(1), originalName: 'p1.png' }] as MediaAsset[];
    mount({
      onSelect,
      onOpenChange,
      maxSelect: 4,
      initialSelectedUrls: [url(1)],
    });

    fireEvent.click(screen.getByRole('button', { name: /^Insert/ }));

    expect(onSelect).toHaveBeenCalledWith([url(1)], []);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(assets).toHaveLength(1);
  });

  it('cancels without selecting anything', () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    mount({ onSelect, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
