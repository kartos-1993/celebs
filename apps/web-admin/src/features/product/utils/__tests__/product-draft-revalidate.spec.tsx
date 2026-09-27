import { useForm } from 'react-hook-form';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@celebs/shared-utils';

import { resolveResetValidationScope, useProductDraft } from '../../hooks/use-product-draft';
import type { ProductFormValues } from '../../types';

vi.mock('@celebs/shared-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@celebs/shared-utils')>();
  const stubbedLogger = Object.create(actual.logger) as typeof actual.logger;
  stubbedLogger.warn = vi.fn();
  stubbedLogger.error = vi.fn();
  return { ...actual, logger: stubbedLogger };
});

/** Renders the hook around a REAL form so `trigger` re-derives errors. */
const renderDraft = (visibleFieldNames?: string[]) =>
  renderHook(() => {
    const form = useForm<ProductFormValues>({ mode: 'onChange', shouldUnregister: false });
    return { form, draft: useProductDraft({ form, isEditMode: false, visibleFieldNames }) };
  });

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(logger.warn).mockClear();
});

describe('resolveResetValidationScope', () => {
  it('always includes the basic-info fields the draft resets', () => {
    expect(resolveResetValidationScope()).toEqual([
      'name',
      'brand',
      'description',
      'categoryId',
      'subcategoryId',
    ]);
  });

  it('merges the visible schema scope without duplicates', () => {
    const scope = resolveResetValidationScope(['price', 'name', 'Color']);
    expect(scope).toEqual([
      'name',
      'brand',
      'description',
      'categoryId',
      'subcategoryId',
      'price',
      'Color',
    ]);
    expect(new Set(scope).size).toBe(scope.length);
  });
});

describe('useProductDraft reset paths', () => {
  it('re-validates visible fields after clearing errors on discard', async () => {
    // Registered rules are what `trigger` re-runs: an unregistered field has
    // nothing to validate against, which is exactly why clearing alone used to
    // look like "valid".
    const { result } = renderHook(() => {
      const form = useForm<ProductFormValues>({ mode: 'onChange', shouldUnregister: false });
      form.register('name', { required: 'Name is required' });
      form.register('price', { required: 'Price is required' });
      return {
        form,
        draft: useProductDraft({ form, isEditMode: false, visibleFieldNames: ['price'] }),
      };
    });

    act(() => {
      result.current.form.setError('name', { type: 'manual', message: 'Name is required' });
      result.current.form.setError('price', { type: 'manual', message: 'Price is required' });
    });
    expect(result.current.form.getFieldState('name').error?.message).toBe('Name is required');
    expect(result.current.form.getFieldState('price').error?.message).toBe('Price is required');

    act(() => {
      result.current.draft.discardDraft();
    });

    // Errors are cleared AND re-derived: a blanked required field is invalid
    // again instead of looking like a cleared-but-valid field.
    expect(result.current.form.getValues('name')).toBe('');
    await waitFor(() => {
      expect(result.current.form.formState.errors.name?.message).toBe('Name is required');
      expect(result.current.form.formState.errors.price?.message).toBe('Price is required');
    });
  });

  it('re-validates the visible scope after a category reset', async () => {
    const { result } = renderHook(() => {
      const form = useForm<ProductFormValues>({ mode: 'onChange', shouldUnregister: false });
      form.register('Color', { required: 'Pick a color' });
      return {
        form,
        draft: useProductDraft({ form, isEditMode: false, visibleFieldNames: ['Color'] }),
      };
    });

    act(() => {
      result.current.form.setError('Color', { type: 'manual', message: 'Pick a color' });
    });

    act(() => {
      result.current.draft.resetForNewCategory('cat-9');
    });

    expect(result.current.form.getValues('categoryId')).toBe('cat-9');
    expect(result.current.form.getValues('subcategoryId')).toBe('cat-9');
    await waitFor(() =>
      expect(result.current.form.formState.errors.Color?.message).toBe('Pick a color'),
    );
  });

  it('clears errors for fields outside the reset scope', async () => {
    const { result } = renderDraft([]);

    act(() => {
      result.current.form.setError('mysteryField', { type: 'manual', message: 'boom' });
    });

    act(() => {
      result.current.draft.discardDraft();
    });

    await waitFor(() => expect(result.current.form.formState.errors.mysteryField).toBeUndefined());
  });

  it('does not re-apply a stale draft on re-render', () => {
    window.localStorage.setItem(
      'web-admin.product-draft.add',
      JSON.stringify({ savedAt: new Date().toISOString(), values: { name: 'Restored name' } }),
    );

    const { result, rerender } = renderHook(() => {
      const form = useForm<ProductFormValues>({ shouldUnregister: false });
      return useProductDraft({ form, isEditMode: false });
    });

    expect(result.current.restoredDraftAt).not.toBeNull();
    rerender();
    expect(result.current.restoredDraftAt).not.toBeNull();
  });
});

describe('useProductDraft storage failures', () => {
  it('logs a warning and returns false when an explicit draft save fails', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => {
      const form = useForm<ProductFormValues>();
      form.setValue('name', 'Tee');
      form.setValue('categoryId', 'cat-1');
      form.setValue('subcategoryId', 'cat-2');
      return useProductDraft({ form, isEditMode: false, userId: 'u-1' });
    });

    let saved = true;
    act(() => {
      saved = result.current.saveDraftNow();
    });

    expect(saved).toBe(false);
    expect(result.current.restoredDraftAt).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      'Draft save skipped: storage unavailable or quota exceeded',
    );
    setItem.mockRestore();
  });
});
