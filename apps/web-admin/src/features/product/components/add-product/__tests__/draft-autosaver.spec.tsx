import React, { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@celebs/shared-utils';

import type { ProductFormValues } from '../../../types';
import { DraftAutoSaver } from '../draft-autosaver';

vi.mock('@celebs/shared-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@celebs/shared-utils')>();
  const stubbedLogger = Object.create(actual.logger) as typeof actual.logger;
  stubbedLogger.warn = vi.fn();
  stubbedLogger.error = vi.fn();
  return { ...actual, logger: stubbedLogger };
});

const formValues = { categoryId: 'cat-1', subcategoryId: 'cat-2', name: 'Tee' };

interface HarnessProps {
  isEditMode?: boolean;
  draftRestored?: boolean;
}

const Harness = ({ isEditMode = false, draftRestored = true }: HarnessProps) => {
  const form = useForm<ProductFormValues>({ shouldUnregister: false });
  const control = useMemo(() => form.control, [form]);
  return (
    <FormProvider {...form}>
      <DraftAutoSaver
        control={control}
        draftRestored={draftRestored}
        isEditMode={isEditMode}
        watchedCategoryId="cat-1"
        watchedSubcategoryId="cat-2"
        categoryPath={['Root', 'Shirts']}
        getValues={() => formValues}
        userId="u-1"
        storeId="s-1"
      />
    </FormProvider>
  );
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(logger.warn).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DraftAutoSaver', () => {
  it('persists the draft after the debounce window', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    render(<Harness />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setItem).toHaveBeenCalledTimes(1);
    const [key, payload] = setItem.mock.calls[0];
    expect(key).toBe('web-admin.product-draft.add.u-1.s-1');
    expect(JSON.parse(payload as string)).toMatchObject({
      categoryPath: ['Root', 'Shirts'],
      storeId: 's-1',
      values: { categoryId: 'cat-1', subcategoryId: 'cat-2' },
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a warning and stays best-effort when localStorage rejects the write', () => {
    const failure = new Error('QuotaExceededError');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw failure;
    });

    // Rendering must not throw: autosave is best-effort, the explicit
    // "Save Draft" action is what surfaces storage failures to the seller.
    expect(() => {
      render(<Harness />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      { error: failure },
      'Draft autosave skipped: storage unavailable or quota exceeded',
    );
  });

  it('does not write in edit mode or before the draft is restored', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    render(
      <>
        <Harness isEditMode />
        <Harness draftRestored={false} />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setItem).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
