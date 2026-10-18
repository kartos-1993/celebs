import { describe, expect, it } from 'vitest';

import { shortcutFilterParams } from '../use-category-filters';

describe('shortcutFilterParams — typed chip selection mapping', () => {
  it('maps subcategory chips to the subcategory param', () => {
    expect(shortcutFilterParams({ type: 'subcategory', value: 'men-jeans' })).toEqual({
      subcategory: 'men-jeans',
    });
  });

  it('maps campaign chips to the campaign param', () => {
    expect(shortcutFilterParams({ type: 'campaign', value: 'dashain-2082' })).toEqual({
      campaign: 'dashain-2082',
    });
  });

  it('returns no params for null selections', () => {
    expect(shortcutFilterParams(null)).toEqual({});
  });

  it('returns no params for shortcut types without a list filter axis', () => {
    expect(shortcutFilterParams({ type: 'attribute', value: 'color-red' })).toEqual({});
    expect(shortcutFilterParams({ type: 'collection', value: 'summer-edit' })).toEqual({});
  });
});
