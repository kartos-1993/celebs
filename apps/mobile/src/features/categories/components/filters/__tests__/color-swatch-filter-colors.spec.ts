import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Palette } from '@/constants/theme';

/**
 * The quick-filter colour dots must come from the design tokens.
 *
 * The component used to hold a private `COLOR_HEX_MAP` of raw Tailwind-style
 * hex values. Every one of those values that ALREADY existed in `Palette` is
 * now a token reference; the substitution is only legal when the token's value
 * is identical, so this file pins both halves of that rule:
 *
 *  1. no raw hex literal survives in the component, and
 *  2. each token it now uses is byte-identical (case-insensitive) to the hex it
 *     replaced — so the refactor is provably a rename, not a repaint.
 *
 * Names whose hex has no identical token (blue, beige, multicolor) are
 * deliberately absent from the map and fall through to the shared
 * `SWATCH_DOT_FALLBACK_COLOR`; borrowing a near-miss would have silently moved
 * a colour on screen.
 */

const SRC = readFileSync(resolve(__dirname, '../color-swatch-filter.tsx'), 'utf8');

// Prose may name the hexes it replaced; CODE is what actually executes.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The hex each mapped quick-filter name used to resolve to. */
const PREVIOUS_HEX: Record<string, string> = {
  black: '#18181b',
  white: '#ffffff',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#eab308',
  grey: '#6b7280',
  gray: '#6b7280',
};

/** The token each of those names is now bound to. */
const EXPECTED_TOKEN: Record<string, string> = {
  black: 'Palette.gray900',
  white: 'Palette.white',
  red: 'Palette.danger',
  green: 'Palette.success',
  yellow: 'Palette.gold',
  grey: 'Palette.gray500',
  gray: 'Palette.gray500',
};

const tokenValue: Record<string, string> = {
  'Palette.gray900': Palette.gray900,
  'Palette.white': Palette.white,
  'Palette.danger': Palette.danger,
  'Palette.success': Palette.success,
  'Palette.gold': Palette.gold,
  'Palette.gray500': Palette.gray500,
};

describe('quick-filter swatch dots use design tokens, not invented hex', () => {
  it('contains no raw hex colour literal at all', () => {
    expect(CODE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('no longer keeps a private COLOR_HEX_MAP of raw hex values', () => {
    expect(CODE).not.toContain('COLOR_HEX_MAP');
  });

  it.each(Object.entries(EXPECTED_TOKEN))('maps "%s" to %s', (name, token) => {
    expect(CODE).toContain(`${name}: ${token}`);
  });

  it.each(Object.entries(PREVIOUS_HEX))(
    'token for "%s" is byte-identical to the hex it replaced',
    (name, hex) => {
      const token = EXPECTED_TOKEN[name];
      expect(token).toBeDefined();
      expect(tokenValue[token].toLowerCase()).toBe(hex.toLowerCase());
    },
  );

  it('drops the names that had no identical token rather than borrowing a near-miss', () => {
    for (const name of ['blue', 'beige', 'multicolor']) {
      expect(CODE).not.toContain(`${name}: `);
    }
  });

  it('still falls through to the shared swatch fallback for unmapped names', () => {
    expect(CODE).toContain('SWATCH_DOT_FALLBACK_COLOR');
  });
});
