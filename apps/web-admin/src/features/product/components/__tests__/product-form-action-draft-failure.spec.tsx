import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductFormActions from '../product-form-action';
import { getDraftSaveFailureCopy } from '../product-form-action-labels';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

const toastMock = vi.fn();

const baseProps = {
  isDirty: true,
  isReady: true,
  onCancel: vi.fn(),
  onSaveAsDraft: vi.fn(),
};

function renderActions(overrides: Partial<typeof baseProps> = {}) {
  return render(<ProductFormActions {...baseProps} {...overrides} />);
}

beforeEach(() => {
  toastMock.mockClear();
  baseProps.onCancel.mockClear();
  baseProps.onSaveAsDraft.mockReset();
});

describe('Save Draft must report a save that did not happen', () => {
  it('raises the failure toast when the draft hook returns false', () => {
    // `false` is the hook's whole failure signal: no category yet, or browser
    // storage refusing the write. It used to be dropped on the floor, so the
    // click looked identical to a successful save.
    baseProps.onSaveAsDraft.mockReturnValue(false);
    renderActions();

    fireEvent.click(screen.getByTestId('save-draft-btn'));

    expect(baseProps.onSaveAsDraft).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith({
      ...getDraftSaveFailureCopy(),
      variant: 'destructive',
    });
  });

  it('stays silent on a successful save', () => {
    baseProps.onSaveAsDraft.mockReturnValue(true);
    renderActions();

    fireEvent.click(screen.getByTestId('save-draft-btn'));

    expect(baseProps.onSaveAsDraft).toHaveBeenCalledTimes(1);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('names both failure causes, because neither is guessable from the UI', () => {
    const { title, description } = getDraftSaveFailureCopy();
    expect(title).toBe('Draft not saved');
    expect(description).toMatch(/category/i);
    expect(description).toMatch(/storage/i);
  });

  it('keeps Save Draft a type="button" so the submit gate never runs for it', () => {
    // Pinned so the failure toast cannot be "fixed" by routing the draft through
    // the validated submit path (which would block partial work).
    renderActions();
    expect(screen.getByTestId('save-draft-btn').getAttribute('type')).toBe('button');
  });
});
