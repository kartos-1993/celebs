import { describe, expect, it } from 'vitest';

import { encodeCode128B, generateBarcodeBars } from '../barcode-utils';

describe('encodeCode128B', () => {
  it('encodes standard alphanumeric retail SKU strings into valid Code 128 patterns', () => {
    const sku = 'CLB-HUB-A1B2C3';
    const pattern = encodeCode128B(sku);

    expect(typeof pattern).toBe('string');
    expect(pattern.length).toBeGreaterThan(0);
    // Code 128 patterns only consist of digit widths 1, 2, 3, 4
    expect(pattern).toMatch(/^[1-4]+$/);
  });

  it('produces deterministic output for identical inputs', () => {
    const run1 = encodeCode128B('CLB-COT-BLK-M');
    const run2 = encodeCode128B('CLB-COT-BLK-M');
    expect(run1).toBe(run2);
  });

  it('produces different patterns for distinct SKUs', () => {
    const pattern1 = encodeCode128B('CLB-COT-BLK-M');
    const pattern2 = encodeCode128B('CLB-COT-BLK-L');
    expect(pattern1).not.toBe(pattern2);
  });

  it('pins the golden Code 128-B output for a single character (start + data + checksum + stop)', () => {
    // 'A' = code 33; checksum = (104 + 33 * 1) % 103 = 34.
    // start-B(104)='211214', 33='111323', 34='131123', stop='2331112'.
    expect(encodeCode128B('A')).toBe('2112141113231311232331112');
  });

  it('pins the golden Code 128-B output for an empty string (start + checksum + stop)', () => {
    // checksum = 104 % 103 = 1 -> '222122'.
    expect(encodeCode128B('')).toBe('2112142221222331112');
  });

  it('throws a descriptive error on out-of-range characters instead of silently skipping', () => {
    expect(() => encodeCode128B('CLB-•-HUB')).toThrow(/unsupported character/);
    expect(() => encodeCode128B('café')).toThrow(/U\+00E9/);
    expect(() => encodeCode128B('A\u{1F600}')).toThrow(
      /Code 128-B supports U\+0020\.\.U\+007E only/,
    );
  });

  it('only ever receives in-range input from the barcode pipeline (uppercased clean SKUs)', () => {
    // BarcodeSticker passes sku.trim().toUpperCase() (or 'CLB-ITEM-STD');
    // buildBarcodeItems emits `CLB-<PREFIX>-<CODE>` in the same alphabet.
    // The hostile-input proof (non-ASCII vendor SKUs/ids) lives in barcode-builder.spec.ts.
    const stickerInputs = [
      'CLB-HUB-7F892B',
      'CLB-ITEM-STD',
      'clb-x1  '.trim().toUpperCase(),
      'CLB-COT-BLK-M',
      'Black / XL'.toUpperCase(),
    ];
    for (const input of stickerInputs) {
      for (const char of input) {
        const charCode = char.charCodeAt(0);
        expect(charCode).toBeGreaterThanOrEqual(32);
        expect(charCode).toBeLessThanOrEqual(126);
      }
      expect(() => encodeCode128B(input)).not.toThrow();
    }
  });
});

describe('generateBarcodeBars', () => {
  it('converts a digit pattern string into an alternating sequence of bars and spaces', () => {
    const pattern = '212222';
    const bars = generateBarcodeBars(pattern);

    expect(bars).toHaveLength(6);
    expect(bars[0]).toEqual({ width: 2, isBar: true });
    expect(bars[1]).toEqual({ width: 1, isBar: false });
    expect(bars[2]).toEqual({ width: 2, isBar: true });
    expect(bars[3]).toEqual({ width: 2, isBar: false });
    expect(bars[4]).toEqual({ width: 2, isBar: true });
    expect(bars[5]).toEqual({ width: 2, isBar: false });
  });

  it('correctly calculates total unit modules across all bars and spaces', () => {
    const pattern = '1234';
    const bars = generateBarcodeBars(pattern);
    const totalWidth = bars.reduce((sum, b) => sum + b.width, 0);
    expect(totalWidth).toBe(10);
  });
});
