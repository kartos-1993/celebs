import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SizeMeasurementHeader } from '../size-measurement-header';

/**
 * The toggle CONVERTS every already-entered value (`convertMeasurementValue` in
 * `use-size-measurements-state.ts`, pinned by
 * `size-measurement-unit-toggle.spec.tsx`). The header never said so: the copy
 * read as a pure relabelling, so a seller with 40cm chest measurements tapped
 * IN, saw no change to the numbers, and could not tell the chart was about to
 * publish 15.7.
 *
 * The disclosure belongs on the control that performs the conversion, next to
 * the existing purpose sentence — not in a spec and not behind a tooltip.
 */

const renderHeader = (unit: 'CM' | 'IN' = 'CM') =>
  render(<SizeMeasurementHeader unit={unit} onUnitToggle={vi.fn()} />);

describe('the CM/IN toggle must disclose that it converts entered values', () => {
  it('says switching units converts the values already entered', () => {
    renderHeader();
    const copy = screen.getByText(/Switching between CM and IN/).textContent ?? '';
    expect(copy).toMatch(/converts the values you have already entered/i);
  });

  it('keeps the original purpose sentence in the same paragraph', () => {
    renderHeader();
    // One <p>, not a detached aside: the disclosure must read as part of what
    // the field is for.
    const paragraph = screen.getByText(/Provide measurements/);
    expect(paragraph.tagName).toBe('P');
    expect(paragraph.textContent).toMatch(/Switching between CM and IN/);
  });

  it('is present whichever unit is currently active', () => {
    renderHeader('IN');
    expect(screen.getByText(/Switching between CM and IN/)).toBeTruthy();
  });

  it('never implies the toggle is a label-only change', () => {
    renderHeader();
    const copy = screen.getByText(/Provide measurements/).textContent ?? '';
    expect(copy).not.toMatch(/label|relabel|just changes?/i);
  });
});
