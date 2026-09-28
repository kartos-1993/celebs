import { describe, expect, it } from 'vitest';

import type { FieldSpec, ProductSidebarSection } from '../../types';
import { buildSidebarSections } from '../add-product-validation';

/**
 * Section completeness is a three-state question, not a yes/no one:
 *
 *   'untouched'  nothing in the section has been answered yet
 *   'incomplete' the seller started it and something is still missing
 *   'complete'   nothing is missing
 *
 * A pristine form must therefore never read as "complete" — that is exactly
 * how an empty form ends up looking finished in the sidebar.
 */

const statusOf = (section: ProductSidebarSection): string => `${section.status}`;

/**
 * "This section is done", asserted about the BEHAVIOUR rather than the spelling.
 * Each case below fails loudly against a `status: boolean` implementation,
 * because a pristine section reported as boolean `true` is the defect.
 */
const isDone = (section: ProductSidebarSection): boolean => statusOf(section) === 'complete';

const sectionOf = (sections: ProductSidebarSection[], key: string): ProductSidebarSection => {
  const found = sections.find((section) => section.key === key);
  if (!found) throw new Error(`no "${key}" section in the sidebar`);
  return found;
};

/**
 * `FieldSpec['dataSource']` is declared as `Record<string, unknown>`, but a
 * variant axis's option list is read as an ARRAY of `{ value, label }` (see
 * `add-product-helpers.getLabelMap`). The declared type is under-specified, so
 * the fixture is widened here rather than typed as `any`.
 */
const axisOptions = (options: Array<{ value: string; label: string }>) =>
  options as unknown as FieldSpec['dataSource'];

const schemaFields: FieldSpec[] = [
  { name: 'mainImage', uiType: 'MainImage', label: 'Cover Photo', group: 'base', required: true },
  { name: 'textSpecAttribute', uiType: 'input', label: 'Fabric', group: 'details' },
  { name: 'numberSpecAttribute', uiType: 'number', label: 'Waist', group: 'details' },
  { name: 'thirdSpecAttribute', uiType: 'input', label: 'Collar', group: 'details' },
  {
    name: 'Color',
    uiType: 'multiselect',
    label: 'Color',
    group: 'variant',
    required: true,
    dataSource: axisOptions([
      { value: 'Red', label: 'Red' },
      { value: 'Blue', label: 'Blue' },
    ]),
  },
  {
    name: 'Size',
    uiType: 'multiselect',
    label: 'Size',
    group: 'variant',
    required: true,
    dataSource: axisOptions([{ value: 'M', label: 'M' }]),
  },
  { name: 'packageLengthCm', uiType: 'number', label: 'Parcel Length (cm)', group: 'package' },
  {
    name: 'warrantyPeriod',
    uiType: 'input',
    label: 'Warranty Duration',
    group: 'termcondition',
    required: true,
  },
];

const variantMeta = [
  { key: 'Color', label: 'Color' },
  { key: 'Size', label: 'Size' },
];

const sectionsFor = (values: Record<string, unknown>): ProductSidebarSection[] =>
  buildSidebarSections({
    fieldErrors: [],
    schemaFields,
    schemaHasName: false,
    values,
    variantMeta,
  });

const BASE_ANSWERED = {
  name: 'Handwoven Cotton Kurta',
  brand: 'Annapurna',
  description: 'A handwoven kurta with side pockets.',
  categoryId: 'cat-women',
  subcategoryId: 'sub-kurta',
  mainImage: ['https://cdn.example.com/cover-1.jpg'],
  textSpecAttribute: 'Cotton',
  numberSpecAttribute: '32',
  thirdSpecAttribute: 'Mandarin',
};

const PRICING_ANSWERED = {
  ...BASE_ANSWERED,
  Color: ['Red'],
  Size: ['M'],
  'sku.variants.Color.Red.Size.M.price': '2400',
  'sku.variants.Color.Red.Size.M.stock': '4',
  'sku.variants.Color.Red.Size.M.sellerSku': 'ANNA-RED-M',
};

describe('sidebar section completeness', () => {
  it('never reports shipping complete while the seller has answered nothing', () => {
    const sections = sectionsFor({});

    expect(isDone(sectionOf(sections, 'shipping'))).toBe(false);
  });

  it('never reports pricing complete when only the base fields are filled', () => {
    const sections = sectionsFor(BASE_ANSWERED);

    expect(isDone(sectionOf(sections, 'pricing'))).toBe(false);
  });

  it('reports every section as untouched for a pristine form', () => {
    const sections = sectionsFor({});

    expect(sections.map(statusOf)).toEqual(sections.map(() => 'untouched'));
  });

  it('lets a fully answered pricing section reach complete', () => {
    const sections = sectionsFor(PRICING_ANSWERED);

    expect(statusOf(sectionOf(sections, 'pricing'))).toBe('complete');
  });

  it('lets a terms section with no errors reach complete', () => {
    const sections = sectionsFor({ ...PRICING_ANSWERED, warrantyPeriod: '12 months' });

    expect(statusOf(sectionOf(sections, 'terms'))).toBe('complete');
  });

  it('reports a still-loading schema as a non-error state, not a failing section', () => {
    // Nothing is known yet, so nothing can be a user error. Reporting
    // "Form fields are still loading." as a validation failure paints the whole
    // sidebar red before the seller has even seen a field.
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: [],
      schemaHasName: false,
      values: {},
      variantMeta,
    });

    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(section.errors).toEqual([]);
      expect(statusOf(section)).toBe('untouched');
    }
  });
});
