import { describe, expect, it } from 'vitest';

import { type CoverageStatus, isDispatchAllowed } from '../delivery-coverage';

describe('isDispatchAllowed', () => {
  describe('an automated courier dispatch', () => {
    // Booking a consignment needs a zone the courier confirmed. UNVERIFIED is a
    // gap in our mirror, not permission to guess.
    const cases: Array<[CoverageStatus, boolean]> = [
      ['COVERED', true],
      ['UNVERIFIED', false],
      ['UNCOVERED', false],
    ];

    it.each(cases)('reports %s as allowed=%s', (status, expected) => {
      expect(isDispatchAllowed(status, false)).toBe(expected);
    });
  });

  describe('a manual handover by the seller', () => {
    // UNCOVERED is refused even by hand: the mirror says the courier does not
    // serve the area, so handing the parcel over creates a promise we break.
    const cases: Array<[CoverageStatus, boolean]> = [
      ['COVERED', true],
      ['UNVERIFIED', true],
      ['UNCOVERED', false],
    ];

    it.each(cases)('reports %s as allowed=%s', (status, expected) => {
      expect(isDispatchAllowed(status, true)).toBe(expected);
    });
  });

  it('refuses a manual handover to an area the courier has retired', () => {
    expect(isDispatchAllowed('UNCOVERED', true)).toBe(false);
  });

  it('allows a manual handover when only our own mirror is missing data', () => {
    expect(isDispatchAllowed('UNVERIFIED', true)).toBe(true);
  });
});
