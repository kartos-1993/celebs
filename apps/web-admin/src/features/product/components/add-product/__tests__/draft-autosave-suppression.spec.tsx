import React, { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductDraft } from '../../../hooks/use-product-draft';
import type { ProductFormValues } from '../../../types';
import { getDraftStorageKey } from '../../../utils/add-product-helpers';
import { DraftAutoSaver } from '../draft-autosaver';

/**
 * A DISCARDED DRAFT MUST STAY DISCARDED.
 *
 * `discardDraft` / `resetForNewCategory` remove the saved draft and blank the
 * form. The autosave is a 1s debounce over the entire form, so ~1s later it
 * wrote that blank form back to localStorage. The next visit then reported the
 * discarded work as a "restored draft" — work the seller had explicitly thrown
 * away, resurrected by the very feature meant to protect it.
 *
 * The flag is cleared by the first SELLER edit, which is why the discriminator
 * needs RHF's event type and not just the changed field name: a category switch
 * always runs `handleSubcategoryChange` (a `setValue`) immediately after the
 * reset, and a name-only test would un-suppress before the seller typed a
 * character.
 */

const DRAFT_KEY = getDraftStorageKey('u-1', 's-1');
const CATEGORY_B = 'sub-category-b';

/** The live draft hook, so the spec can read the flag the autosave consumes. */
let liveDraft: ReturnType<typeof useProductDraft> | null = null;
/** The live form, so the spec can drive real seller edits through RHF. */
let liveForm: ReturnType<typeof useForm<ProductFormValues>> | null = null;

function Journey() {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      name: 'Handwoven Cotton Kurta',
      brand: 'Manfinity',
      categoryId: 'sub-category-a',
      subcategoryId: 'sub-category-a',
      status: 'draft',
    },
    shouldUnregister: false,
  });
  liveForm = form;
  const draft = useProductDraft({
    form,
    userId: 'u-1',
    storeId: 's-1',
    isEditMode: false,
    visibleFieldNames: useMemo(() => ['name', 'brand'], []),
  });
  liveDraft = draft;

  return (
    <FormProvider {...form}>
      <DraftAutoSaver
        control={form.control}
        draftRestored={draft.draftRestored}
        isEditMode={false}
        suppressAutosave={draft.isDraftAutosaveSuppressed}
        watchedCategoryId={String(form.watch('categoryId') || '')}
        watchedSubcategoryId={String(form.watch('subcategoryId') || '')}
        categoryPath={draft.categoryPath}
        getValues={form.getValues}
        userId="u-1"
        storeId="s-1"
      />
      <input {...form.register('name')} aria-label="product name" />
      <button type="button" onClick={() => draft.discardDraft()}>
        discard
      </button>
      <button type="button" onClick={() => draft.resetForNewCategory(CATEGORY_B)}>
        switch
      </button>
    </FormProvider>
  );
}

const storedDraft = () => window.localStorage.getItem(DRAFT_KEY);
const isSuppressed = () => liveDraft?.isDraftAutosaveSuppressed ?? false;

/** Past the 1s autosave debounce, with the microtasks around it flushed. */
const settlePastDebounce = () =>
  act(() => {
    vi.advanceTimersByTime(1500);
  });

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  liveDraft = null;
  liveForm = null;
  render(<Journey />);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a discarded draft must not be rewritten by the autosave', () => {
  it('leaves the draft deleted after a discard, however long the page lives', () => {
    // A real draft on disk to discard in the first place.
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: new Date().toISOString() }));
    expect(storedDraft()).not.toBeNull();

    act(() => {
      screen.getByText('discard').click();
    });

    expect(isSuppressed()).toBe(true);
    settlePastDebounce();

    // THE DEFECT: this was the blank form, rewritten and reported as a draft.
    expect(storedDraft()).toBeNull();
    expect(liveDraft?.restoredDraftAt).toBeNull();
  });

  it('leaves the draft deleted after a category switch', () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: new Date().toISOString() }));

    act(() => {
      screen.getByText('switch').click();
    });

    expect(isSuppressed()).toBe(true);
    settlePastDebounce();
    expect(storedDraft()).toBeNull();
  });

  it('does NOT flip draftRestored — the form must stay on screen', () => {
    act(() => {
      screen.getByText('discard').click();
    });

    // Suppressing the autosave by hiding the form would be a worse bug than the
    // one being fixed: the seller is left staring at a spinner.
    expect(liveDraft?.draftRestored).toBe(true);
    expect(screen.getByLabelText('product name')).toBeTruthy();
  });
});

describe('suppression lifts on the first real seller edit', () => {
  it('resumes autosaving once the seller types', () => {
    // The switch path, not the discard path: a discard blanks the category, and
    // a draft with no category was never saveable — so there would be nothing
    // for the resumed autosave to write and the test would prove nothing.
    act(() => {
      screen.getByText('switch').click();
    });
    expect(isSuppressed()).toBe(true);

    // A real DOM keystroke: RHF names the field AND the event type.
    act(() => {
      fireEvent.change(screen.getByLabelText('product name'), { target: { value: 'Kurta' } });
    });

    expect(isSuppressed()).toBe(false);
    settlePastDebounce();
    expect(storedDraft()).not.toBeNull();
  });

  it('stays suppressed across the programmatic write a category switch always makes', () => {
    act(() => {
      screen.getByText('switch').click();
    });
    // The production sequence: `handleSubcategoryChange` runs setValue right
    // after the reset, and it happens BEFORE any seller keystroke.
    act(() => {
      liveForm?.setValue('subcategoryId', CATEGORY_B, { shouldDirty: true });
    });

    expect(isSuppressed()).toBe(true);
    settlePastDebounce();
    expect(storedDraft()).toBeNull();
  });

  it('stays suppressed across the form.reset the reset itself performs', () => {
    act(() => {
      screen.getByText('switch').click();
    });
    act(() => {
      liveForm?.reset({ name: '', brand: '' });
    });

    expect(isSuppressed()).toBe(true);
    settlePastDebounce();
    expect(storedDraft()).toBeNull();
  });
});
