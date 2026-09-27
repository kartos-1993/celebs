import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { FieldSpec } from '../../types';
import {
  buildSidebarSections,
  collectBasicSectionErrors,
  collectColorImageErrors,
  collectCoverError,
  collectImageSectionErrors,
  collectPricingErrors,
  collectPricingSectionErrors,
  collectShippingErrors,
  collectShippingSectionErrors,
  collectSpecificationSectionErrors,
  collectTermsSectionErrors,
  collectTotalStockError,
  flattenFormErrors,
  getRequiredFieldErrors,
  groupFieldErrorsBySection,
  groupFieldsBySchemaGroup,
  PRODUCT_SECTION_ANCHORS,
} from '../add-product-validation';

const detailsFields: FieldSpec[] = [
  { name: 'Fabric', uiType: 'input', label: 'Fabric', group: 'details' },
  { name: 'Occasion', uiType: 'input', label: 'Occasion', group: 'details' },
  { name: 'FitType', uiType: 'input', label: 'Fit Type', group: 'details' },
  { name: 'Collar', uiType: 'input', label: 'Collar Style', group: 'details' },
];

const variantFields: FieldSpec[] = [
  { name: 'Color', uiType: 'multiselect', label: 'Color', group: 'variant' },
  { name: 'Size', uiType: 'multiselect', label: 'Size', group: 'variant' },
];

describe('getRequiredFieldErrors', () => {
  it('flags required visible fields with empty values', () => {
    const fields: FieldSpec[] = [
      { name: 'Fabric', uiType: 'input', label: 'Fabric', group: 'details', required: true },
      { name: 'Nick', uiType: 'input', label: 'Nick', group: 'details' },
      {
        name: 'Hidden',
        uiType: 'input',
        label: 'Hidden',
        group: 'details',
        required: true,
        visible: false,
      },
    ];
    expect(getRequiredFieldErrors(fields, {})).toEqual(['Fabric is required.']);
  });

  it('treats filled values as satisfied', () => {
    const fields: FieldSpec[] = [
      { name: 'Fabric', uiType: 'input', label: 'Fabric', group: 'details', required: true },
    ];
    expect(getRequiredFieldErrors(fields, { Fabric: 'Cotton' })).toEqual([]);
  });
});

describe('flattenFormErrors (add-product-validation)', () => {
  it('flattens nested error objects to path/message pairs', () => {
    const flat = flattenFormErrors({
      name: { message: 'Required' },
      sku: { default: { price: { message: 'Bad price' } } },
    } as never);
    expect(flat).toContainEqual({ path: 'name', message: 'Required' });
    expect(flat).toContainEqual({ path: 'sku.default.price', message: 'Bad price' });
  });

  it('keeps BOTH the parent message and nested children', () => {
    const flat = flattenFormErrors({
      sku: { message: 'SKU invalid', default: { price: { message: 'Bad price' } } },
    } as never);
    expect(flat).toContainEqual({ path: 'sku', message: 'SKU invalid' });
    expect(flat).toContainEqual({ path: 'sku.default.price', message: 'Bad price' });
    // the fix: unified — the single core keeps both; form-focus.ts delegates to it.
  });

  it('returns [] for undefined or non-object input', () => {
    expect(flattenFormErrors(undefined)).toEqual([]);
    expect(flattenFormErrors({} as never)).toEqual([]);
  });
});

describe('collectPricingErrors', () => {
  it('accepts a fully populated default SKU row', () => {
    expect(
      collectPricingErrors({
        fields: [],
        values: { sku: { default: { price: '1200', stock: '5', sellerSku: 'SKU-1' } } },
        variantMeta: [],
      }),
    ).toEqual([]);
  });

  it('coerces numeric strings the same as numbers', () => {
    // the fix canonical coercion: form inputs emit strings so '1200' is accepted
    // intentionally; non-numbers are rejected exactly like Zod z.number().
    const fromString = collectPricingErrors({
      fields: [],
      values: { sku: { default: { price: '1200', stock: '5', sellerSku: 'SKU-1' } } },
      variantMeta: [],
    });
    const fromNumber = collectPricingErrors({
      fields: [],
      values: { sku: { default: { price: 1200, stock: 5, sellerSku: 'SKU-1' } } },
      variantMeta: [],
    });
    expect(fromString).toEqual([]);
    expect(fromNumber).toEqual([]);
  });

  it('rejects non-numbers like Zod', () => {
    const errors = collectPricingErrors({
      fields: [],
      values: { sku: { default: { price: 'abc', stock: true, sellerSku: 'SKU-1' } } },
      variantMeta: [],
    });
    expect(errors).toContain('Default SKU: add a valid price.');
    expect(errors).toContain('Default SKU: stock must be a whole number of 0 or more.');
  });

  it('reports a missing stock cell as missing, not as a bad number', () => {
    expect(
      collectPricingErrors({
        fields: [],
        values: { sku: { default: { price: '100', sellerSku: 'SKU-1' } } },
        variantMeta: [],
      }),
    ).toContain('Default SKU: stock quantity is required.');
  });

  it('validates special price per row against that row price', () => {
    // Kept client-side on purpose: createProductSchema refines discountedPrice <
    // price at the ROOT only, so the matrix row is the only place the
    // comparison can be reported for the offending variant.
    const errors = collectPricingErrors({
      fields: [],
      values: {
        sku: { default: { price: '100', specialPrice: '150', stock: '5', sellerSku: 'SKU-1' } },
      },
      variantMeta: [],
    });
    expect(errors).toContain('Default SKU: special price must be lower than price.');
  });

  it('rejects fractional stock instead of silently truncating it', () => {
    // Zod z.number().int() rejects 2.9; Math.trunc used to accept it as 2.
    expect(
      collectPricingErrors({
        fields: [],
        values: { sku: { default: { price: '100', stock: '2.9', sellerSku: 'SKU-1' } } },
        variantMeta: [],
      }),
    ).toEqual(['Default SKU: stock must be a whole number of 0 or more.']);
  });

  it('caps output at 6 errors and states the exact overflow count', () => {
    // 3 rows × 3 errors = 9 real errors; the cap keeps the sidebar readable but
    // must never hide how many are left behind.
    const errors = collectPricingErrors({
      fields: [],
      values: { Size: ['A', 'B', 'C'], sku: { variants: { Size: {} } } },
      variantMeta: [{ key: 'Size', label: 'Size' }],
    });
    expect(errors).toHaveLength(7);
    expect(errors[6]).toBe(
      '+3 more pricing errors — open the Pricing section to review the full list.',
    );
  });
});

describe('collectColorImageErrors', () => {
  const variantMeta = [{ key: 'Color', label: 'Color' }];

  it('returns [] without a color axis or selection', () => {
    expect(collectColorImageErrors({ values: {}, variantMeta: [] })).toEqual([]);
    expect(collectColorImageErrors({ values: {}, variantMeta })).toEqual([]);
  });

  it('passes when the selected color has gallery images', () => {
    expect(
      collectColorImageErrors({
        values: { Color: ['Red'], variants: { colorMeta: { Red: { images: ['u'] } } } },
        variantMeta,
      }),
    ).toEqual([]);
  });

  it('flags selected colors missing gallery images', () => {
    expect(collectColorImageErrors({ values: { Color: ['Red'] }, variantMeta })).toEqual([
      'Add at least one product photo for color Red.',
    ]);
  });
});

describe('collectTotalStockError', () => {
  it('passes when nested sku stock sums above zero', () => {
    expect(
      collectTotalStockError({
        values: { sku: { default: { price: '100', stock: '5', sellerSku: 'SKU-1' } } },
      }),
    ).toEqual([]);
  });

  it('flags zero total stock with a message that names the real dimension', () => {
    expect(collectTotalStockError({ values: {} })).toEqual([
      'Add at least 1 unit of stock across variants to publish.',
    ]);
  });

  it('counts stock held only inside array-shaped sizes/skus/colorVariants', () => {
    // The old regex + shallow flatten missed colorVariants[].stocks[].quantity
    // because it never descended into arrays.
    expect(
      collectTotalStockError({ values: { colorVariants: [{ stocks: [{ quantity: 5 }] }] } }),
    ).toEqual([]);
    expect(
      collectTotalStockError({ values: { skus: [{ price: 10, stock: 3, skuCode: 'A' }] } }),
    ).toEqual([]);
    expect(collectTotalStockError({ values: { sizes: [{ name: 'S', stock: 0 }] } })).toEqual([
      'Add at least 1 unit of stock across variants to publish.',
    ]);
  });
});

describe('collectCoverError', () => {
  it('passes with a cover photo', () => {
    expect(collectCoverError({ values: { mainImage: ['u'] } })).toEqual([]);
  });

  it('passes with a flat color-gallery key', () => {
    expect(collectCoverError({ values: { 'variants.colorMeta.Red.images': ['u'] } })).toEqual([]);
  });

  it('flags a missing cover and gallery', () => {
    expect(collectCoverError({ values: {} })).toEqual([
      'Add a cover photo or at least one color gallery photo.',
    ]);
  });
});

describe('collectShippingErrors', () => {
  it('does not require an explicit package weight because the server defaults it', () => {
    // shippingDetailsSchema defaults packageWeightKg to 0.3, so hard-failing a
    // blank weight would block a payload the server accepts.
    expect(collectShippingErrors({ values: {} })).toEqual([]);
  });

  it('rejects an explicit non-positive weight and names every offending dimension', () => {
    expect(collectShippingErrors({ values: { packageWeightKg: 0 } })).toEqual([
      'Package weight must be greater than 0 kg (leave blank to use the 0.3 kg default).',
    ]);
    expect(
      collectShippingErrors({ values: { packageWeightKg: 0.5, packageLengthCm: -2 } }),
    ).toEqual(['Parcel length must be a positive number in cm.']);
    // No early break: all three bad dimensions are reported at once.
    expect(collectShippingErrors({ values: { packageLengthCm: -2, packageWidthCm: 0 } })).toEqual([
      'Parcel length must be a positive number in cm.',
      'Parcel width must be a positive number in cm.',
    ]);
  });

  it('requires warranty duration when warranty is offered', () => {
    expect(
      collectShippingErrors({
        values: { packageWeightKg: 0.5, warrantyType: 'BRAND_WARRANTY', warrantyPeriod: '' },
      }),
    ).toContain('Specify warranty duration when warranty is offered.');
  });
});

describe('groupFieldErrorsBySection', () => {
  const schemaFields: FieldSpec[] = [
    ...variantFields,
    { name: 'packageWeightKg', uiType: 'number', label: 'Weight', group: 'package' },
  ];

  it('routes known paths to their sections', () => {
    const grouped = groupFieldErrorsBySection(
      [
        { path: 'name', message: 'bad name' },
        { path: 'mainImage', message: 'bad image' },
        { path: 'sku.default.price', message: 'bad price' },
        { path: 'packageWeightKg', message: 'bad weight' },
      ],
      schemaFields,
    );
    expect(grouped.basic).toEqual(['bad name']);
    expect(grouped.images).toEqual(['bad image']);
    expect(grouped.pricing).toEqual(['bad price']);
    expect(grouped.shipping).toEqual(['bad weight']);
  });

  it('routes variant-picker errors to pricing, not images', () => {
    // The color/size selects render in the Variants card of the pricing
    // section — resolvePageSectionKey's "images" default put them one card off.
    const grouped = groupFieldErrorsBySection([{ path: 'Color', message: 'pick' }], schemaFields);
    expect(grouped.pricing).toEqual(['pick']);
    expect(grouped.images).toEqual([]);
  });

  it('routes unknown paths to the visible general bucket instead of details', () => {
    const grouped = groupFieldErrorsBySection(
      [{ path: 'someFutureField', message: 'x' }],
      schemaFields,
    );
    expect(grouped.general).toEqual(['x']);
    expect(grouped.specification).toEqual([]);
  });
});

describe('groupFieldsBySchemaGroup', () => {
  it('buckets base/details/variant/package/terms groups', () => {
    const fields: FieldSpec[] = [
      { name: 'a', uiType: 'input', label: 'A', group: 'base' },
      { name: 'b', uiType: 'input', label: 'B', group: 'details' },
      { name: 'c', uiType: 'multiselect', label: 'C', group: 'variant' },
      { name: 'd', uiType: 'input', label: 'D', group: 'package' },
      { name: 'e', uiType: 'input', label: 'E', group: 'termcondition' },
    ];
    const grouped = groupFieldsBySchemaGroup(fields);
    expect(grouped.base.map((f) => f.name)).toEqual(['a']);
    expect(grouped.details.map((f) => f.name)).toEqual(['b']);
    expect(grouped.variant.map((f) => f.name)).toEqual(['c']);
    expect(grouped.package.map((f) => f.name)).toEqual(['d']);
    expect(grouped.terms.map((f) => f.name)).toEqual(['e']);
  });

  it('puts group-less fields into details', () => {
    // Intentional: a field with no group still renders in the generic
    // attributes card. Only ERROR PATHS with no known section are diverted to
    // the general bucket (see groupFieldErrorsBySection).
    const grouped = groupFieldsBySchemaGroup([
      { name: 'mystery', uiType: 'input', label: 'M', group: '' },
    ]);
    expect(grouped.details.map((f) => f.name)).toEqual(['mystery']);
  });

  it('leaves sale-grouped fields in no bucket', () => {
    // The sale group is the pricing matrix itself, which is driven by
    // collectPricingErrors — not by a FieldSpec bucket.
    const grouped = groupFieldsBySchemaGroup([
      { name: 'price', uiType: 'number', label: 'P', group: 'sale' },
    ]);
    const all = [
      ...grouped.base,
      ...grouped.details,
      ...grouped.variant,
      ...grouped.package,
      ...grouped.terms,
    ];
    expect(all.map((f) => f.name)).not.toContain('price');
  });
});

describe('collectBasicSectionErrors', () => {
  it('enforces the 2-character Zod minimum for name', () => {
    // baseProductSchema: name min 2 (the old sidebar rule of 30 rejected
    // payloads the server happily accepted).
    const short = collectBasicSectionErrors({
      errors: [],
      values: { name: 'x', categoryId: 'c', subcategoryId: 's' },
      schemaHasName: false,
    });
    expect(short).toContain('Product name must be at least 2 characters.');
    const ok = collectBasicSectionErrors({
      errors: [],
      values: { name: 'xy', categoryId: 'c', subcategoryId: 's' },
      schemaHasName: false,
    });
    expect(ok).toEqual([]);
  });

  it('skips the name rule when the schema owns the name field', () => {
    expect(
      collectBasicSectionErrors({
        errors: [],
        values: { name: 'x', categoryId: 'c', subcategoryId: 's' },
        schemaHasName: true,
      }),
    ).toEqual([]);
  });

  it('requires a category pair', () => {
    expect(collectBasicSectionErrors({ errors: [], values: {}, schemaHasName: true })).toContain(
      'Select a product category before publishing.',
    );
  });
});

describe('collectSpecificationSectionErrors', () => {
  it('requires 3 filled attributes', () => {
    const errors = collectSpecificationSectionErrors({
      errors: [],
      detailsFields,
      values: { Fabric: 'Cotton', Occasion: 'Casual' },
    });
    expect(errors).toEqual(['Fill at least 3 specification attributes (currently 2 filled).']);
  });

  it('does not count blank or single-character fills toward min-3', () => {
    // Three 1-char values used to satisfy the min-3 rule (any non-empty
    // string counted as filled).
    const errors = collectSpecificationSectionErrors({
      errors: [],
      detailsFields,
      values: { Fabric: 'x', Occasion: 'y', FitType: 'z' },
    });
    expect(errors).toEqual(['Fill at least 3 specification attributes (currently 0 filled).']);
  });

  it('scales the threshold down for small schemas', () => {
    const errors = collectSpecificationSectionErrors({
      errors: [],
      detailsFields: detailsFields.slice(0, 2),
      values: { Fabric: 'Cotton' },
    });
    expect(errors).toEqual(['Fill at least 2 specification attributes (currently 1 filled).']);
  });
});

describe('section collectors merge zod-mapped errors with custom rules', () => {
  it('collectPricingSectionErrors unions errors, required variants, pricing, stock', () => {
    const errors = collectPricingSectionErrors({
      errors: ['mapped err'],
      schemaFields: variantFields,
      variantFields,
      values: {},
      variantMeta: [],
    });
    expect(errors).toContain('mapped err');
    expect(errors.length).toBeGreaterThan(1);
  });

  it('collectImageSectionErrors unions cover and color errors', () => {
    const errors = collectImageSectionErrors({
      errors: [],
      baseFields: [],
      values: { Color: ['Red'] },
      variantMeta: [{ key: 'Color', label: 'Color' }],
      schemaFields: [],
    });
    expect(errors).toContain('Add at least one product photo for color Red.');
    expect(errors).toContain('Add a cover photo or at least one color gallery photo.');
  });

  it('collectShippingSectionErrors and collectTermsSectionErrors merge', () => {
    expect(
      collectShippingSectionErrors({ errors: ['e1'], packageFields: [], values: {} }),
    ).toContain('e1');
    const termsFields: FieldSpec[] = [
      { name: 'T', uiType: 'input', label: 'T', group: 'termcondition', required: true },
    ];
    expect(collectTermsSectionErrors({ errors: [], termsFields, values: {} })).toEqual([
      'T is required.',
    ]);
  });
});

describe('PRODUCT_SECTION_ANCHORS', () => {
  it('keeps values identical to the original string literals', () => {
    expect(PRODUCT_SECTION_ANCHORS).toEqual({
      basic: 'product-section-basic',
      images: 'product-section-base',
      specification: 'product-section-details',
      pricingSale: 'product-section-sale',
      pricingVariant: 'product-section-variant',
      shipping: 'product-section-package',
      terms: 'product-section-termcondition',
    });
  });
});

describe('section anchors exist on a rendered element', () => {
  const source = (rel: string) =>
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', rel), 'utf8');

  it.each([
    ['components/dynamic-product-form.tsx', PRODUCT_SECTION_ANCHORS.images],
    ['components/dynamic-product-form.tsx', PRODUCT_SECTION_ANCHORS.specification],
    ['components/dynamic-product-form.tsx', PRODUCT_SECTION_ANCHORS.pricingSale],
    ['components/dynamic-product-form.tsx', PRODUCT_SECTION_ANCHORS.pricingVariant],
    ['components/dynamic-product-form.tsx', PRODUCT_SECTION_ANCHORS.terms],
    ['components/add-product/add-product-basic-section.tsx', PRODUCT_SECTION_ANCHORS.basic],
  ])('%s renders id="%s"', (rel, anchorId) => {
    expect(source(rel)).toContain(`"${anchorId}"`);
  });

  it('shipping-warranty-section points its id at the shared constant', () => {
    expect(source('components/shipping-warranty-section.tsx')).toContain(
      'id={PRODUCT_SECTION_ANCHORS.shipping}',
    );
  });
});

describe('buildSidebarSections', () => {
  const fullSchema: FieldSpec[] = [
    { name: 'mainImage', uiType: 'MainImage', label: 'Cover', group: 'base' },
    ...detailsFields,
    ...variantFields,
  ];

  const fullValues = {
    name: 'x'.repeat(30),
    categoryId: 'c1',
    subcategoryId: 's1',
    mainImage: ['u'],
    Fabric: 'Cotton',
    Occasion: 'Casual',
    FitType: 'Regular',
    sku: { default: { price: '100', stock: '5', sellerSku: 'SKU-1' } },
    packageWeightKg: 0.5,
  };

  it('marks every section complete for a fully valid form', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: fullSchema,
      schemaHasName: false,
      values: fullValues,
      variantMeta: [],
    });
    expect(sections.map((s) => s.key)).toEqual([
      'basic',
      'images',
      'specification',
      'pricing',
      'shipping',
    ]);
    expect(sections.every((s) => s.status)).toBe(true);
    // Completion math mirrors use-submission-state.ts:
    // Math.round((completedCount / sections.length) * 100)
    const completedCount = sections.filter((s) => s.status).length;
    expect(Math.round((completedCount / sections.length) * 100)).toBe(100);
  });

  it('derives section statuses from failing slices', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: fullSchema,
      schemaHasName: false,
      values: {},
      variantMeta: [],
    });
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
    expect(byKey.basic.status).toBe(false);
    expect(byKey.images.status).toBe(false);
    expect(byKey.specification.status).toBe(false);
    expect(byKey.pricing.status).toBe(false);
    // Shipping passes on a blank form: packageWeightKg is server-defaulted.
    expect(byKey.shipping.status).toBe(true);
    const completedCount = sections.filter((s) => s.status).length;
    expect(Math.round((completedCount / sections.length) * 100)).toBe(20);
  });

  it('surfaces every section as incomplete when the schema is empty', () => {
    // The old code returned ONLY the basic section, hiding images/pricing/
    // shipping failures behind a ready-looking checklist.
    const sections = buildSidebarSections({
      fieldErrors: [{ path: 'sku.default.price', message: 'bad' }],
      schemaFields: [],
      schemaHasName: true,
      values: { categoryId: 'c1', subcategoryId: 's1' },
      variantMeta: [],
    });
    expect(sections.map((s) => s.key)).toEqual([
      'basic',
      'images',
      'specification',
      'pricing',
      'shipping',
    ]);
    expect(sections.every((s) => s.status === false)).toBe(true);
    const completedCount = sections.filter((s) => s.status).length;
    expect(Math.round((completedCount / sections.length) * 100)).toBe(0);
  });

  it('uses fixed anchor ids per section', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: fullSchema,
      schemaHasName: false,
      values: fullValues,
      variantMeta: [],
    });
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
    expect(byKey.basic.anchorId).toBe('product-section-basic');
    expect(byKey.images.anchorId).toBe('product-section-base');
    expect(byKey.specification.anchorId).toBe('product-section-details');
    expect(byKey.shipping.anchorId).toBe('product-section-package');
  });

  it('flips the pricing anchor to variant only when a required variant exists', () => {
    // Deterministic rule: required variant => variant anchor, else sale. It
    // never depends on which errors happen to be present, so a scroll always
    // lands on the card that owns the field.
    const requiredVariants: FieldSpec[] = variantFields.map((f) => ({ ...f, required: true }));
    const bad = buildSidebarSections({
      fieldErrors: [{ path: 'Color', message: 'pick a color' }],
      schemaFields: [...detailsFields, ...requiredVariants],
      schemaHasName: true,
      values: { categoryId: 'c', subcategoryId: 's', packageWeightKg: 0.5 },
      variantMeta: [],
    });
    expect(bad.find((s) => s.key === 'pricing')?.anchorId).toBe('product-section-variant');

    const plain = buildSidebarSections({
      fieldErrors: [{ path: 'Color', message: 'pick a color' }],
      schemaFields: [...detailsFields, ...variantFields],
      schemaHasName: true,
      values: { categoryId: 'c', subcategoryId: 's', packageWeightKg: 0.5 },
      variantMeta: [],
    });
    expect(plain.find((s) => s.key === 'pricing')?.anchorId).toBe('product-section-sale');
  });

  it('appends a terms section only for visible terms fields', () => {
    const withTerms = buildSidebarSections({
      fieldErrors: [],
      schemaFields: [
        ...fullSchema,
        { name: 'T', uiType: 'input', label: 'T', group: 'termcondition', required: true },
      ],
      schemaHasName: false,
      values: fullValues,
      variantMeta: [],
    });
    expect(withTerms.map((s) => s.key)).toContain('terms');
    expect(withTerms.find((s) => s.key === 'terms')?.anchorId).toBe(
      'product-section-termcondition',
    );
  });

  it('surfaces unmappable errors in a visible general section that counts against completion', () => {
    const sections = buildSidebarSections({
      fieldErrors: [{ path: 'someFutureField', message: 'x' }],
      schemaFields: fullSchema,
      schemaHasName: false,
      values: fullValues,
      variantMeta: [],
    });
    const general = sections.find((s) => s.key === 'general');
    expect(general).toBeDefined();
    expect(general?.errors).toEqual(['x']);
    expect(general?.status).toBe(false);
    // The 5 original sections are still complete, so the score drops by the
    // one unmappable error instead of being silently ignored.
    const completedCount = sections.filter((s) => s.status).length;
    expect(Math.round((completedCount / sections.length) * 100)).toBe(83);
  });
});
