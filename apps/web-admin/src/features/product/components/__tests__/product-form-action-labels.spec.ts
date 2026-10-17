import { describe, expect, it } from 'vitest';

import { getStatusHeader, getSubmitButtonLabel } from '../product-form-action-labels';

describe('getSubmitButtonLabel', () => {
  it('labels edit mode by publish permission, ignoring readiness', () => {
    expect(getSubmitButtonLabel(true, false, true)).toBe('Save Changes');
    expect(getSubmitButtonLabel(true, true, true)).toBe('Save Changes');
    expect(getSubmitButtonLabel(true, false, false)).toBe('Submit Changes for Review');
    expect(getSubmitButtonLabel(true, true, false)).toBe('Submit Changes for Review');
  });

  it('requires both readiness and publish permission for Publish Product', () => {
    expect(getSubmitButtonLabel(false, true, true)).toBe('Publish Product');
    expect(getSubmitButtonLabel(false, true, false)).toBe('Submit for Review');
    expect(getSubmitButtonLabel(false, false, true)).toBe('Submit for Review');
    expect(getSubmitButtonLabel(false, false, false)).toBe('Submit for Review');
  });
});

describe('getStatusHeader', () => {
  it('reports missing details first regardless of mode or permission', () => {
    expect(getStatusHeader(false, false, false)).toBe('More details are still required');
    expect(getStatusHeader(false, true, true)).toBe('More details are still required');
  });

  it('distinguishes save vs review vs publish when ready', () => {
    expect(getStatusHeader(true, true, true)).toBe('Ready to save changes');
    expect(getStatusHeader(true, true, false)).toBe('Ready to submit for review');
    expect(getStatusHeader(true, false, true)).toBe('Ready to publish');
    expect(getStatusHeader(true, false, false)).toBe('Ready to submit for review');
  });
});
