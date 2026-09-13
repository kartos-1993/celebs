import slugify from 'slugify';

import type { AttributeGroup as AllowedGroup } from '@celebs/shared-types';

import prisma from '../../config/db.prisma';

interface SeedAttr {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values?: string[];
  isRequired?: boolean;
  isVariant?: boolean;
  variantType?: 'color' | 'size' | null;
  useStandardOptions?: boolean;
  optionSetName?: string;
  group?: AllowedGroup;
  filterUiType?: 'checkbox' | 'color_swatch' | 'size_box' | 'range_slider';
  isStorefrontFilter?: boolean;
}

interface SeedCategory {
  name: string;
  sizeChartColumns?: string[];
  bodyChartColumns?: string[];
  attributes?: SeedAttr[];
  children?: SeedCategory[];
  imageUrl?: string;
}

function mkAttr(a: SeedAttr, optionSetMap: Map<string, string>) {
  const group: AllowedGroup = a.group ? a.group : a.isVariant ? 'variant' : 'details';
  const coercedType: SeedAttr['type'] =
    a.isVariant && (a.variantType === 'color' || a.variantType === 'size') ? 'multiselect' : a.type;

  let optionSetId: string | null = null;
  if (a.useStandardOptions && a.optionSetName && optionSetMap.has(a.optionSetName)) {
    optionSetId = optionSetMap.get(a.optionSetName)!;
  }

  return {
    name: a.name,
    type: coercedType,
    values: a.values ?? [],
    isRequired: a.isRequired ?? false,
    isVariant: !!a.isVariant,
    variantType: a.variantType ?? null,
    useStandardOptions: !!a.useStandardOptions,
    optionSetId,
    optionSetName: a.optionSetName ?? null,
    group,
  };
}

async function ensureCategory(
  parent: Record<string, unknown> | null,
  name: string,
  sizeChartColumns?: string[],
  bodyChartColumns?: string[],
  imageUrl?: string,
) {
  const slug = slugify(name, { lower: true, strict: true });
  const level = parent ? ((parent.level as number) || 1) + 1 : 1;
  const parentCategory = parent ? String(parent.id) : null;
  const parentPath = parent
    ? Array.isArray(parent.path)
      ? parent.path
      : [parent.path as string]
    : [];
  const pathParts = [...parentPath, slug];
  const path = pathParts.join('/');

  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ slug }, { name, parentCategory }],
    },
  });

  if (existing) {
    return await prisma.category.update({
      where: { id: existing.id },
      data: {
        name,
        slug,
        level,
        parentCategory,
        path,
        imageUrl: imageUrl || null,
        sizeChartColumns: sizeChartColumns || [],
        bodyChartColumns: bodyChartColumns || [],
      },
    });
  }

  return await prisma.category.create({
    data: {
      name,
      slug,
      level,
      parentCategory,
      path,
      imageUrl: imageUrl || null,
      sizeChartColumns: sizeChartColumns || [],
      bodyChartColumns: bodyChartColumns || [],
      attributes: [],
      isActive: true,
    },
  });
}

async function createAttributesAndFilters(
  categoryId: string,
  attrs: SeedAttr[],
  optionSetMap: Map<string, string>,
) {
  const formattedAttributes = attrs.map((a) => mkAttr(a, optionSetMap));

  await prisma.category.update({
    where: { id: categoryId },
    data: { attributes: formattedAttributes },
  });
}

async function seedTree(root: SeedCategory) {
  const optionSets = await prisma.optionSet.findMany();
  const optionSetMap = new Map<string, string>();
  for (const set of optionSets) {
    optionSetMap.set(set.name, set.id);
  }

  async function walk(node: SeedCategory, parent: Record<string, unknown> | null) {
    const cat = await ensureCategory(
      parent,
      node.name,
      node.sizeChartColumns,
      node.bodyChartColumns,
      node.imageUrl,
    );
    if (node.attributes?.length) {
      await createAttributesAndFilters(cat.id, node.attributes, optionSetMap);
    }
    if (node.children?.length) {
      for (const child of node.children) {
        await walk(child, cat);
      }
    }
  }
  await walk(root, null);
}

// ==========================================
// SHARED & REUSABLE SHEIN-GRADE ATTRIBUTES
// ==========================================

const colorAttr: SeedAttr = {
  name: 'Color',
  type: 'select',
  isVariant: true,
  variantType: 'color',
  useStandardOptions: true,
  optionSetName: 'Basic Colors',
};

const sizeAttr: SeedAttr = {
  name: 'Size',
  type: 'select',
  isVariant: true,
  variantType: 'size',
  useStandardOptions: true,
  optionSetName: 'Alpha Sizes (XXS-5XL)',
};

const numericSizeAttr: SeedAttr = {
  name: 'Waist Size',
  type: 'select',
  isVariant: true,
  variantType: 'size',
  useStandardOptions: true,
  optionSetName: 'Numeric Sizes (26-46)',
};

const shoeSizeAttr: SeedAttr = {
  name: 'Shoe Size',
  type: 'select',
  isVariant: true,
  variantType: 'size',
  useStandardOptions: true,
  optionSetName: 'Shoe Sizes (EU / UK / US)',
};

const priceRangeAttr: SeedAttr = {
  name: 'Price Range',
  type: 'number',
  isVariant: false,
  isStorefrontFilter: true,
  filterUiType: 'range_slider',
};

const fabricElasticityAttr: SeedAttr = {
  name: 'Fabric Elasticity',
  type: 'select',
  useStandardOptions: true,
  optionSetName: 'Fabric Elasticity',
  values: ['Non-Stretch', 'Slight Stretch', 'Medium Stretch', 'High Stretch'],
};

const careInstructionsAttr: SeedAttr = {
  name: 'Care Instructions',
  type: 'select',
  useStandardOptions: true,
  optionSetName: 'Care Instructions',
  values: [
    'Machine wash or professional dry clean',
    'Hand wash cold, do not dry clean',
    'Machine wash cold, gentle cycle',
    'Professional dry clean only',
    'Do not bleach / Line dry',
    'Hand wash cold, line dry in shade',
  ],
};

const seasonsAttr: SeedAttr = {
  name: 'Season',
  type: 'select',
  useStandardOptions: true,
  optionSetName: 'Apparel Seasons',
  values: ['All-Season', 'Spring / Summer', 'Fall / Winter', 'Summer', 'Winter'],
};

const sheerAttr: SeedAttr = {
  name: 'Sheer',
  type: 'select',
  values: ['No', 'Semi-Sheer', 'Yes'],
};

const nepaliFestivalsAttr: SeedAttr = {
  name: 'Festivals',
  type: 'multiselect',
  values: [
    'Dashain',
    'Tihar / Deepawali',
    'Holi',
    'Teej',
    'Lhosar',
    'Chhath',
    'Eid / Ramadan',
    'Maghe Sankranti',
    'New Year',
    'Christmas',
    "Valentine's Day",
    "Father's Day",
    'Wedding / Vivaha Season',
  ],
};

const scenesAttr: SeedAttr = {
  name: 'Scenes',
  type: 'multiselect',
  values: [
    'Daily Casual',
    'Office / Work',
    'Streetwear',
    'Party & Club',
    'Weekend Outing',
    'Sports & Gym',
    'Vacation & Resort',
    'Wedding & Formal',
    'Date Night',
  ],
};

// ==========================================
// MEN CATEGORIES TREE CONFIGURATION
// ==========================================

const ALL_MEN_CATEGORIES_TREE: SeedCategory = {
  name: 'Men',
  children: [
    // ----------------------------------------------------
    // 1. Men Denim
    // ----------------------------------------------------
    {
      name: 'Men Denim',
      imageUrl:
        'https://img.ltwebstatic.com/images3_pi/2022/12/13/16709088609e5e4ea6645646042c2f005b3be6ce61_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Denim Jackets',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2024/07/15/22/17210064545039901e6e3dfcbd0015edca0258d1f3_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size', 'Hip Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit', 'Relaxed Fit'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Trucker Jacket',
                'Shacket',
                'Sherpa Denim Jacket',
                'Denim Vest',
                'Distressed Denim Jacket',
                'Biker Denim Jacket',
                'Hooded Denim Jacket',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: [
                'Point Collar',
                'Spread Collar',
                'Stand Collar',
                'Hooded',
                'Shearling / Fleece Collar',
              ],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Single Breasted', 'Button Front', 'Zipper', 'Snap Button'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Regular', 'Longline', 'Crop'],
            },
            {
              name: 'Wash / Color',
              type: 'select',
              values: [
                'Light Wash',
                'Medium Wash',
                'Dark Wash',
                'Acid Wash',
                'Raw Indigo',
                'Vintage Washed',
                'Washed Black',
                'Bleached',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Flap Pockets',
                'Button Front',
                'Ripped / Distressed',
                'Raw Hem',
                'Contrast Stitching',
                'Fleece Lined',
                'Embroidery',
                'Patchwork',
                'Side Welt Pockets',
                'Drawstring Hood',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: ['Plain / Solid', 'Graphic Print', 'Colorblock', 'Tie Dye', 'Vintage Washed'],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve', 'Sleeveless', 'Short Sleeve'],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Regular Sleeve', 'Drop Shoulder'],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Unlined', 'Fleece Lined', 'Sherpa Lined', 'Thermal Lined'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['100% Cotton Denim', 'Stretch Denim', 'Cotton-Poly Blend Denim'],
            },
            fabricElasticityAttr,
            sheerAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Denim Tops',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2024/09/25/4b/1727250684fb643501a5e1ae77c570b6d4512bc0f7_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size', 'Hip Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Slim Fit', 'Relaxed Fit', 'Oversized'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Western Denim Shirt',
                'Workwear Denim Shirt',
                'Casual Chambray',
                'Short Sleeve Denim Shirt',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: ['Shirt Collar', 'Point Collar', 'Mandarin Collar', 'Camp Collar'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: ['Single Breasted', 'Snap Button', 'Half Placket'],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve', 'Short Sleeve', 'Half Sleeve'],
            },
            {
              name: 'Wash',
              type: 'select',
              values: ['Light Wash', 'Medium Wash', 'Dark Wash', 'Acid Wash', 'Vintage Black'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Western Yoke',
                'Chest Flap Pockets',
                'Contrast Stitching',
                'Raw Hem',
                'Distressed',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['100% Cotton Denim', 'Chambray', 'Cotton-Tencel Blend'],
            },
            fabricElasticityAttr,
            sheerAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Denim Shorts',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2024/09/02/b0/1725267156942095cf3541162ecf7aafe9e075e7a9_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Waist Size', 'Hip Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Baggy / Loose', 'Regular Fit', 'Slim Fit', 'Relaxed Fit'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Baggy Jorts',
                'Classic 5-Pocket Shorts',
                'Cargo Denim Shorts',
                'Carpenter Shorts',
                'Cut-Off Raw Hem Shorts',
              ],
            },
            colorAttr,
            sizeAttr,
            numericSizeAttr,
            {
              name: 'Waist Line',
              type: 'select',
              values: ['High Waist', 'Natural (Mid Waist)', 'Low Waist'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Knee Length', 'Bermuda', 'Above Knee', 'Long'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Zipper Fly', 'Button Fly'],
            },
            {
              name: 'Wash',
              type: 'select',
              values: [
                'Light Wash',
                'Medium Wash',
                'Dark Wash',
                'Acid Wash',
                'Vintage Bleached',
                'Raw Indigo',
                'Washed Black',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Ripped / Distressed',
                'Raw Hem',
                'Carpenter Utility Loop',
                'Contrast Stitching',
                'Whiskering',
                'Multi-Pocket',
                'Cargo Pockets',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['100% Cotton Denim', 'Stretch Denim', 'Cotton-Poly Blend'],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Jeans',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/spmp/2026/04/10/72/177580797171e227096e21fd10bb073f3c4db96c82_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Waist Size', 'Hip Size', 'Height'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: [
                'Straight Leg',
                'Baggy / Loose',
                'Slim Fit',
                'Skinny',
                'Wide Leg',
                'Bootcut',
                'Tapered',
                'Flare',
                'Relaxed Fit',
              ],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Classic 5-Pocket Jeans',
                'Cargo Jeans',
                'Carpenter Jeans',
                'Stacked Jeans',
                'Painter / Utility Jeans',
                'Biker Moto Jeans',
              ],
            },
            colorAttr,
            sizeAttr,
            numericSizeAttr,
            {
              name: 'Waist Line',
              type: 'select',
              values: ['Natural (Mid Waist)', 'High Waist', 'Low Waist'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Zipper Fly', 'Button Fly'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Long', 'Stacked', 'Ankle Length', 'Cropped'],
            },
            {
              name: 'Wash / Finish',
              type: 'select',
              values: [
                'Light Wash',
                'Medium Wash',
                'Dark Wash',
                'Raw / Rinse Indigo',
                'Acid Wash',
                'Bleached Wash',
                'Vintage Washed',
                'Whisker Washed',
                'Black Denim',
                'Grey Denim',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Ripped / Distressed',
                'Raw Hem',
                'Whiskering',
                'Patchwork',
                'Contrast Stitching',
                'Cargo Pockets',
                'Paint Splatter',
                'Chain / D-Ring Detail',
                'Utility Hammer Loop',
              ],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Unlined', 'Fleece Lined (Winter Warm)'],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                '100% Cotton Denim',
                'Stretch Denim',
                'Selvedge Denim',
                'Cotton-Viscose Denim',
              ],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 2. Men Bottoms
    // ----------------------------------------------------
    {
      name: 'Men Bottoms',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/pi/2026/04/10/85/17758108576ca5f1047faeab3e2943a90e0925266b_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Shorts',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/05/12/45/17785670947af5f2615117fab2eceb1ca131c8d4f0_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Waist Size', 'Hip Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Loose', 'Relaxed Fit', 'Slim Fit'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Cargo Shorts',
                'Chino Shorts',
                'Sweat Shorts / Fleece Shorts',
                'Linen Shorts',
                'Boardshorts / Swim Shorts',
                'Athletic / Running Shorts',
                'Casual Drawstring Shorts',
              ],
            },
            colorAttr,
            sizeAttr,
            numericSizeAttr,
            {
              name: 'Waist Line',
              type: 'select',
              values: ['Natural (Mid Waist)', 'High Waist', 'Low Waist'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Drawstring', 'Elastic Waist', 'Button Fly', 'Zipper Fly'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Above Knee', 'Knee Length', 'Bermuda', 'Short (5-7 inch)'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Cargo Pockets',
                'Drawstring',
                'Zipper Pockets',
                'Flap Pockets',
                'Contrast Piping',
                'Side Slits',
                'Multi-Pocket',
                'Elastic Waistband',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Camouflage',
                'Striped',
                'Colorblock',
                'Plaid / Check',
                'Floral / Tropical',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Cotton Twill',
                'French Terry / Fleece',
                'Linen Blend',
                'Polyester / Quick Dry',
                'Nylon Taslan',
                'Waffle Knit',
                'Corduroy',
              ],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Pants',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2025/10/13/a1/176033211447c771514bf5c29ccc2ea9d8f0ec3447_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Waist Size', 'Hip Size', 'Height'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: [
                'Straight Leg',
                'Wide Leg',
                'Baggy',
                'Slim Fit',
                'Tapered',
                'Relaxed Fit',
                'Skinny',
              ],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Cargo Pants',
                'Chinos',
                'Dress Pants / Slacks',
                'Parachute / Track Pants',
                'Carpenter Pants',
                'Linen Pants',
                'Corduroy Pants',
                'Pleated Trousers',
              ],
            },
            colorAttr,
            sizeAttr,
            numericSizeAttr,
            {
              name: 'Waist Line',
              type: 'select',
              values: ['Natural (Mid Waist)', 'High Waist', 'Low Waist'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: [
                'Zipper Fly',
                'Drawstring',
                'Button Fly',
                'Elastic Waist',
                'Extended Tab Button',
              ],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Long', 'Ankle Length', 'Cropped', 'Extra Long (Stacked)'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Pleated Front',
                'Cargo Pockets',
                'Side Stripe',
                'Drawstring Ankle Hem',
                'Flap Pockets',
                'Belt Loops',
                'Contrast Stitching',
                'Slanted Pockets',
                'Chain Detail',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Plaid / Check',
                'Striped',
                'Camouflage',
                'Houndstooth',
                'Colorblock',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Cotton Twill',
                'Polyester Blend',
                'Viscose / Rayon',
                'Linen Blend',
                'Corduroy',
                'Nylon Parachute',
                'Wool Blend',
              ],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Sweatpants',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/04/20/ca/1776662630f7a5b534e2b7e89ebafdef1f671ade3a_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Waist Size', 'Hip Size', 'Height'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Relaxed Fit', 'Baggy', 'Regular Fit', 'Slim Fit', 'Oversized'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Joggers (Cuffed)',
                'Open Bottom Straight Leg',
                'Cargo Sweatpants',
                'Track Pants',
                'Heavyweight Fleece Sweatpants',
                'Baggy Streetwear Sweatpants',
              ],
            },
            colorAttr,
            sizeAttr,
            numericSizeAttr,
            {
              name: 'Waist Line',
              type: 'select',
              values: ['Drawstring Waist', 'Elastic Waist', 'Natural (Mid Waist)', 'High Waist'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Drawstring', 'Elastic'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Long', 'Ankle Length', 'Extra Long'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Cargo Flap Pockets',
                'Zipper Pockets',
                'Drawstring',
                'Ribbed Ankle Cuffs',
                'Side Stripe',
                'Contrast Piping',
                'Raw Hem',
                'Graphic Print',
                'Embroidery',
              ],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Fleece Lined', 'French Terry', 'Unlined', 'Thermal Lined'],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                '100% Cotton',
                'Cotton Blend',
                'Heavyweight Fleece (350+ GSM)',
                'French Terry',
                'Polyester Blend',
              ],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 3. Men Hoodies & Sweatshirts
    // ----------------------------------------------------
    {
      name: 'Men Hoodies & Sweatshirts',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/spmp/2026/04/01/eb/1775008530cdb7c6f8175613efb4cbc1b6560e8629_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Sweatshirts',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/ssms/2025/11/21/f1/1763718468c1d4720b4669b80c197d3ba770875e0a_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Oversized', 'Regular Fit', 'Loose', 'Boxy Fit'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Neckline',
              type: 'select',
              values: ['Crewneck / Round Neck', 'Mock Neck', 'Half-Zip Stand Collar'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Ribbed Collar & Hem',
                'Drop Shoulder',
                'Graphic Print',
                'Embroidery',
                'Vintage Washed',
                'Patchwork',
                'Exposed Seam',
                'Chest Pocket',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Graphic Print',
                'Letter / Slogan Print',
                'Colorblock',
                'Striped',
                'Tie Dye',
              ],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve'],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve'],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Fleece Lined', 'French Terry', 'Thermal Lined', 'Unlined'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['100% Cotton', 'Cotton Blend', 'Fleece', 'French Terry', 'Polyester Blend'],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Zip-up Hoodies',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2024/08/28/d0/17248130253021436450bfa8dcc18d13c6efdc01f2_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Oversized', 'Regular Fit', 'Loose', 'Boxy Cut'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: ['Hooded', 'Drawstring Hood'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Full Zip', 'Double Zip (Two-Way)', 'Quarter-Zip / Half-Zip'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Split Kangaroo Pocket',
                'Drawstring Hood',
                'Ribbed Hem & Cuffs',
                'Drop Shoulder',
                'Graphic Print',
                'Embroidery',
                'Metal Hardware',
                'Thumb Holes',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Graphic Print',
                'Colorblock',
                'Camouflage',
                'Vintage Washed',
              ],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve'],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve'],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Fleece Lined', 'Sherpa Lined', 'French Terry', 'Unlined'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['Cotton Blend', 'Heavyweight Fleece', 'French Terry', 'Polyester Blend'],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Hoodies',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/spmp/2025/11/11/48/17628282858d6432a2484a214557ae57029bbeb309_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Oversized', 'Loose', 'Regular Fit', 'Boxy Cut'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: ['Hooded', 'Drawstring Hood', 'Crossover Hood'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Pullover'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Kangaroo Pocket',
                'Drawstring',
                'Drop Shoulder',
                'Ribbed Hem & Cuffs',
                'Graphic Print',
                'Puff Print',
                'Embroidery',
                'Distressed Hem',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Graphic Print',
                'Letter / Slogan Print',
                'Colorblock',
                'Tie Dye',
                'Abstract',
              ],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve'],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve'],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Fleece Lined', 'French Terry', 'Sherpa Lined', 'Unlined'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['Cotton Blend', '100% Heavyweight Cotton', 'Fleece', 'French Terry'],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 4. Men Suits & Separates
    // ----------------------------------------------------
    {
      name: 'Men Suits & Separates',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/spmp/2026/05/28/1c/17799445898d1e873aee96086ffc4bd6d36d04e8df_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Blazers',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/05/11/96/1778500187896dc421eb5ed65fbd228c007ac0474e_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit', 'Regular Fit', 'Classic Fit', 'Modern Boxy / Oversized'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Lapel',
              type: 'select',
              values: ['Notch Lapel', 'Peak Lapel', 'Shawl Lapel', 'Mandarin / Stand Collar'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: [
                'Single Breasted 1-Button',
                'Single Breasted 2-Button',
                'Double Breasted 4-Button',
                'Double Breasted 6-Button',
              ],
            },
            {
              name: 'Vents',
              type: 'select',
              values: ['Double Vent (Side Vents)', 'Center Vent', 'Ventless / No Vent'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Chest Welt Pocket',
                'Flap Pockets',
                'Ticket Pocket',
                'Kissing Button Cuffs',
                'Inner Pockets',
                'Contrast Lapel',
              ],
            },
            {
              name: 'Body / Lining',
              type: 'select',
              values: ['Fully Lined', 'Half Lined', 'Unlined'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Regular', 'Longline', 'Short'],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Plaid / Glen Check',
                'Houndstooth',
                'Striped / Pinstripe',
                'Jacquard',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Wool Blend',
                'Polyester / Viscose',
                'Linen Blend',
                'Tweed',
                'Velvet',
                'Corduroy',
                'Cotton Blend',
              ],
            },
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Suits',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2024/10/24/c8/17297348147558d025fb1e8d313204fb1066ebe91e_thumbnail_192x.avif',
          sizeChartColumns: [
            'Shoulder',
            'Bust',
            'Length',
            'Sleeve Length',
            'Waist Size',
            'Pant Length',
          ],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size', 'Hip Size'],
          attributes: [
            {
              name: 'Pieces',
              type: 'select',
              values: [
                '2-Piece Set (Blazer + Pants)',
                '3-Piece Set (Blazer + Vest + Pants)',
                'Tuxedo Set',
              ],
            },
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit', 'Tailored Fit', 'Regular Fit', 'Classic Fit'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Lapel',
              type: 'select',
              values: ['Notch Lapel', 'Peak Lapel', 'Shawl Lapel', 'Satin Lapel (Tuxedo)'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: ['Single Breasted', 'Double Breasted'],
            },
            {
              name: 'Pant Front',
              type: 'select',
              values: ['Flat Front', 'Single Pleat', 'Double Pleats'],
            },
            {
              name: 'Vents',
              type: 'select',
              values: ['Side Vents (Double Vent)', 'Center Vent'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Satin Trim',
                'Flap Pockets',
                'Chest Welt Pocket',
                'Vest Included',
                'Adjustable Waistband',
                'Side Slanted Pockets',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['Premium Wool Blend', 'Viscose / Polyester', 'Linen Blend', 'Velvet'],
            },
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Suit Pants',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/05/11/96/1778500187896dc421eb5ed65fbd228c007ac0474e_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Waist Size', 'Hip Size', 'Height'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit', 'Tailored Fit', 'Straight Leg', 'Relaxed Tapered'],
            },
            colorAttr,
            sizeAttr,
            numericSizeAttr,
            {
              name: 'Waist Line',
              type: 'select',
              values: ['Natural (Mid Waist)', 'High Waist', 'Extended Tab Waistband'],
            },
            {
              name: 'Front Style',
              type: 'select',
              values: ['Flat Front', 'Single Pleat', 'Double Pleats'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Hook & Bar Fly', 'Button Fly', 'Zipper Fly', 'Side Adjusters'],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Long', 'Ankle Length', 'Cropped'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Creased Front',
                'Slanted Pockets',
                'Rear Welt Pockets',
                'Side Adjusters (No Belt Loops)',
                'Turn-Up Cuffs / Cuffed Hem',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['Wool Blend', 'Polyester / Viscose', 'Linen Blend', 'Cotton Blend'],
            },
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 5. Men Knitwear
    // ----------------------------------------------------
    {
      name: 'Men Knitwear',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/pi/2026/06/08/58/17808933872729dde98d956d17dbdbf30a03020cae_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Sweaters',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2025/02/14/65/17394974590425c2dd4fb1d55441e6992bd715c3fc_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Oversized', 'Loose', 'Slim Fit'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Pullover Sweater',
                'Cardigan (Button Front)',
                'Zip Cardigan',
                'Sweater Vest',
                'Half-Zip Sweater',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Neckline / Collar',
              type: 'select',
              values: [
                'Crewneck',
                'V-Neck',
                'Turtleneck / Roll Neck',
                'Mock Neck',
                'Half-Zip / Quarter-Zip',
                'Polo Collar',
                'Shawl Collar',
              ],
            },
            {
              name: 'Knit Type / Texture',
              type: 'select',
              values: [
                'Cable Knit',
                'Ribbed Knit',
                'Waffle Knit',
                'Chunky Heavy Knit',
                'Fine Gauge Knit',
                'Bouclé',
                'Fuzzy / Mohair Texture',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Striped',
                'Argyle',
                'Colorblock',
                'Fair Isle',
                'Geometric',
                'Vintage Washed',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Ribbed Hem & Cuffs',
                'Button Front',
                'Drop Shoulder',
                'Contrast Collar',
                'Patchwork',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                '100% Cotton Knit',
                'Wool Blend',
                'Acrylic',
                'Cashmere Blend',
                'Mohair Blend',
                'Chenille',
              ],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Knit Tops',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2025/02/14/65/17394974590425c2dd4fb1d55441e6992bd715c3fc_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit', 'Regular Fit', 'Relaxed Fit'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Neckline / Collar',
              type: 'select',
              values: [
                'Polo Collar',
                'Camp Collar',
                'Crewneck',
                'Open Spread Collar',
                'Button-Down',
              ],
            },
            {
              name: 'Placket',
              type: 'select',
              values: ['Button Placket', 'Zip Placket', 'Open Collar (No Buttons)'],
            },
            {
              name: 'Knit Type',
              type: 'select',
              values: [
                'Fine Ribbed',
                'Waffle Knit',
                'Pointelle / Crochet Open Knit',
                'Textured Pique Knit',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Contrast Tipping',
                'Ribbed Trim',
                'Chest Pocket',
                'Open Stitch',
                'Drop Shoulder',
              ],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Short Sleeve', 'Long Sleeve', 'Half Sleeve', 'Sleeveless'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['Cotton Knit', 'Viscose Blend', 'Linen-Cotton Knit', 'Acrylic Blend'],
            },
            sheerAttr,
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 6. Men Outerwear
    // ----------------------------------------------------
    {
      name: 'Men Outerwear',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/pi/2025/11/19/ac/1763519504614cef3ce1085809d129b340ed34e6ca_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Winter Coats',
          imageUrl:
            'https://img.ltwebstatic.com/images3_pi/2024/08/21/8f/1724218507ea342dc563f8e9ed012910f1a19d2132_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Loose', 'Oversized'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Puffer Coat / Down Jacket',
                'Parka',
                'Wool Overcoat',
                'Trench Coat',
                'Shearling Jacket',
                'Windbreaker',
                'Bomber Jacket',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: [
                'Hooded (with Drawstring)',
                'Stand Collar',
                'Shearling Collar',
                'Lapel / Notched Collar',
                'Fur Trim Hood',
                'Baseball Collar',
              ],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: [
                'Zipper with Storm Flap',
                'Snap Button',
                'Double Breasted',
                'Single Breasted',
                'Full Zipper',
              ],
            },
            {
              name: 'Insulation / Lining',
              type: 'select',
              values: [
                'Down Filled',
                'Sherpa Lined',
                'Fleece Lined',
                'Quilted / Thermal Padded',
                'Polyester Lined',
              ],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Regular', 'Longline / Knee-Length', 'Mid-Length', 'Cropped'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Detachable Hood',
                'Multi-Pocket',
                'Internal Storm Cuffs',
                'Drawstring Waist',
                'Flap Pockets',
                'Arm Utility Pocket',
                'Zipper Pockets',
              ],
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: [
                'Windproof',
                'Waterproof / Water-Resistant',
                'Heavyweight Warmth',
                'Breathable',
                'Reflective',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: ['Plain / Solid', 'Colorblock', 'Camouflage', 'Plaid'],
            },
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Shackets',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/03/10/e4/177311161855a74e830027bd4fb7b36589aa791f3b_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Oversized', 'Loose', 'Regular Fit', 'Boxy Cut'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: ['Shirt Collar', 'Point Collar', 'Spread Collar', 'Shearling Collar'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: ['Button Front', 'Snap Button', 'Zipper Front'],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Heavyweight Flannel',
                'Wool Blend',
                'Corduroy',
                'Cotton Twill',
                'Fleece',
                'Denim',
                'Faux Suede',
              ],
            },
            {
              name: 'Lining / Body',
              type: 'select',
              values: ['Sherpa Lined', 'Quilted Padded', 'Unlined', 'Fleece Lined'],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: ['Plaid / Tartan', 'Plain / Solid', 'Colorblock', 'Houndstooth'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Chest Flap Pockets',
                'Side Welt Pockets',
                'Raw Hem',
                'Button Cuffs',
                'Curved Hem',
              ],
            },
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Jackets and Coats',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/spmp/2025/12/19/b3/1766119478b92a402104496da3309aac0cee6c08c2.webp',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Loose', 'Oversized', 'Slim Fit'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Aviator Jacket',
                'Suede / Faux Suede Jacket',
                'Trucker Jacket',
                'Bomber Jacket',
                'Biker Jacket',
                'Windbreaker',
                'Hooded Jacket',
                'Blazer',
                'Puffer Coat / Down Jacket',
                'Parka',
                'Trench Coat',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: [
                'Stand Collar',
                'Lapel / Notched Collar',
                'Hooded (with Drawstring)',
                'Shearling Collar',
                'Shirt Collar',
                'Baseball Collar',
              ],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: [
                'Full Zipper',
                'Single Breasted',
                'Double Breasted',
                'Snap Button',
                'Zipper with Storm Flap',
              ],
            },
            {
              name: 'Insulation / Lining',
              type: 'select',
              values: [
                'Fleece Lined',
                'Quilted / Thermal Padded',
                'Sherpa Lined',
                'Polyester Lined',
                'Unlined',
              ],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Regular', 'Cropped', 'Mid-Length', 'Longline / Knee-Length'],
            },
            {
              name: 'Details',
              type: 'select',
              values: [
                'Flap Pockets',
                'Zipper Pockets',
                'Multi-Pocket',
                'Drawstring Waist',
                'Ribbed Hem & Cuffs',
                'Contrast Collar',
              ],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: ['Plain / Solid', 'Colorblock', 'Distressed / Washed', 'Quilted'],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve'],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Faux Suede',
                'Cotton Blend',
                'Denim',
                'Polyester Blend',
                'Wool Blend',
                'Leather / Faux Leather',
              ],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 7. Men Traditional & Cultural Wear
    // ----------------------------------------------------
    {
      name: 'Men Traditional & Cultural Wear',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/spmp/2026/04/15/69/1776212811c32ad4720c0cb6b8ae1144991380f978_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Kurta & Suruwal Sets',
          sizeChartColumns: ['Chest', 'Kurta Length', 'Waist', 'Suruwal Length'],
          bodyChartColumns: ['Chest', 'Waist Size', 'Height'],
          attributes: [
            {
              name: 'Style',
              type: 'select',
              values: [
                'Traditional Nepali / Ethnic',
                'Festive Designer',
                'Casual Silk',
                'Wedding / Vivaha Special',
                'Groom / Dulaha Special',
              ],
            },
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Slim Fit', 'Loose Comfort'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: ['Mandarin Collar', 'Nehru Collar', 'Stand Collar', 'Bandhgala Collar'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: [
                'Button Placket',
                'Concealed Placket',
                'Embroidered Placket',
                'Side Slit Placket',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Embroidery Collar',
                'Handcrafted Threadwork',
                'Zari Work',
                'Side Pockets',
                'Chikan Kari Work',
                'Side Slits',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Pure Cotton',
                'Raw Silk',
                'Dhaka Fabric (Palpali / Nepali Handloom)',
                'Dupion Silk',
                'Linen Blend',
                'Jacquard Silk',
                'Khadi',
              ],
            },
            {
              name: 'Festivals',
              type: 'multiselect',
              values: [
                'Dashain',
                'Tihar',
                'Bratabandha',
                'Wedding / Vivaha',
                'Lhosar',
                'Chhath',
                'Eid',
                'Holi',
              ],
            },
            careInstructionsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Nehru Jackets & Waistcoats',
          sizeChartColumns: ['Shoulder', 'Chest', 'Length'],
          bodyChartColumns: ['Chest', 'Height'],
          attributes: [
            {
              name: 'Style',
              type: 'select',
              values: [
                'Ethnic Waistcoat',
                'Bandhgala Vest',
                'Modi / Nehru Jacket',
                'Wedding Special',
              ],
            },
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit', 'Tailored Fit', 'Regular Fit'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: ['Mandarin / Stand Collar', 'Nehru Collar'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: ['Single Breasted 5-Button', 'Single Breasted 6-Button', 'Concealed Placket'],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Palpali Dhaka',
                'Raw Silk',
                'Brocade Silk',
                'Velvet',
                'Cotton Khadi',
                'Jute Blend',
                'Tweed',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Pocket Square Welt',
                'Inner Pocket',
                'Handcrafted Buttons',
                'Contrast Piping',
                'Thread Embroidery',
              ],
            },
            nepaliFestivalsAttr,
            careInstructionsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Asian Wear',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Oversized', 'Loose', 'Relaxed Fit'],
            },
            {
              name: 'Style',
              type: 'select',
              values: [
                'Nepali Daura Suruwal',
                'Asian Modern Fusion',
                'Kimono / Noragi Cardigan',
                'Hanfu Inspired',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Placket',
              type: 'select',
              values: [
                'Asymmetrical Tie-Front (Eight Strings / Ashta Matrika)',
                'Wrap Front',
                'Open Cardigan',
              ],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Kimono Sleeve', 'Regular Sleeve', 'Drop Shoulder'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['Pure Cotton', 'Khadi', 'Linen Blend', 'Silk Blend'],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 8. Men Tops
    // ----------------------------------------------------
    {
      name: 'Men Tops',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/pi/2025/10/15/35/1760494300a33f033ebd1c17204489d7e29790206e_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Shirts',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/spmp/2025/07/12/e7/17523233863dc8cde4cd5bdc679f14a5eb4ea11d2b_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length', 'Bicep Length', 'Cuff'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size', 'Hip Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Slim Fit', 'Oversized', 'Relaxed Fit'],
            },
            {
              name: 'Type',
              type: 'select',
              values: [
                'Casual Shirts',
                'Business / Dress Shirts',
                'Oxford Shirts',
                'Linen Shirts',
                'Utility / Cargo Shirts',
                'Hawaiian / Resort Shirts',
                'Flannel / Plaid Shirts',
                'Corduroy Shirts',
              ],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar / Neckline',
              type: 'select',
              values: [
                'Point Collar',
                'Button-Down Collar',
                'Spread Collar',
                'Mandarin / Band Collar',
                'Camp Collar',
                'Grandad Collar',
              ],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Long Sleeve', 'Short Sleeve', 'Half Sleeve', 'Roll-Up Sleeve'],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Regular Sleeve', 'Drop Shoulder', 'Shirt Sleeve with Cuffs'],
            },
            {
              name: 'Placket',
              type: 'select',
              values: [
                'Single Breasted Button Front',
                'French Placket',
                'Covered Placket',
                'Half Placket',
                'Snap Buttons',
              ],
            },
            {
              name: 'Hem Shaped',
              type: 'select',
              values: ['Curved Hem', 'Straight Hem', 'Side Split'],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Striped',
                'Plaid / Check',
                'Floral / Tropical',
                'Geometric',
                'Colorblock',
                'Polka Dot',
                'Abstract',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Chest Pocket',
                'Dual Flap Pockets',
                'Button Cuffs',
                'Pleated Back',
                'Contrast Piping',
                'Embroidery',
                'Raw Hem',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                '100% Cotton',
                'Oxford Cloth',
                'Linen Blend',
                'Poplin',
                'Corduroy',
                'Flannel',
                'Viscose / Rayon',
                'Tencel',
                'Silk / Satin Blend',
              ],
            },
            fabricElasticityAttr,
            sheerAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men T-Shirts',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/spmp/2026/05/29/73/178004085470f4943ef018f70702b75997f5a4e910_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Regular Fit', 'Oversized', 'Slim Fit', 'Loose', 'Boxy Fit', 'Muscle Fit'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Neckline',
              type: 'select',
              values: ['Round Neck / Crew Neck', 'V-Neck', 'Henley Neck', 'Mock Neck', 'High Neck'],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: [
                'Short Sleeve',
                'Long Sleeve',
                'Half Sleeve',
                'Elbow Length Sleeve',
                'Sleeveless',
              ],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Regular Sleeve', 'Drop Shoulder', 'Raglan Sleeve'],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Graphic Print',
                'Letter / Slogan Print',
                'Striped',
                'Vintage Washed / Acid Wash',
                'Colorblock',
                'Tie Dye',
                'Camouflage',
                'Abstract',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Chest Pocket',
                'Waffle Knit',
                'Ribbed Collar',
                'Distressed / Ripped',
                'Raw Hem',
                'Side Slits',
                'Puff Print',
                'Embroidery',
              ],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Regular', 'Longline', 'Cropped'],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                '100% Cotton',
                'Heavyweight Cotton (220-300 GSM)',
                'Cotton Blend',
                'Modal',
                'Waffle Knit',
                'Ribbed Knit',
                'Polyester Performance',
              ],
            },
            fabricElasticityAttr,
            sheerAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Polo Shirts',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/05/27/f7/177984840592eac6f650e064ac468f8f58f1d4ae82_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit', 'Regular Fit', 'Loose', 'Oversized'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Collar',
              type: 'select',
              values: [
                'Polo Collar',
                'Spread Collar',
                'Zip Collar',
                'Camp / Johnny Collar',
                'Button-Down Collar',
              ],
            },
            {
              name: 'Placket',
              type: 'select',
              values: [
                '2-Button Placket',
                '3-Button Placket',
                'Quarter-Zip / Zip Placket',
                'Buttonless Open Placket (Johnny Collar)',
              ],
            },
            {
              name: 'Sleeve Length',
              type: 'select',
              values: ['Short Sleeve', 'Long Sleeve'],
            },
            {
              name: 'Sleeve Type',
              type: 'select',
              values: ['Regular Sleeve', 'Cuffed Sleeve'],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Striped',
                'Tipped / Contrast Collar',
                'Colorblock',
                'Houndstooth',
                'Textured Knit',
                'Geometric',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Contrast Collar & Cuff Tipping',
                'Chest Pocket',
                'Ribbed Collar',
                'Side Slits',
                'Waffle Knit',
                'Embroidered Logo',
              ],
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Cotton Pique',
                '100% Cotton',
                'Waffle Knit',
                'Textured Knitwear',
                'Cotton-Poly Blend',
                'Performance Quick-Dry',
              ],
            },
            fabricElasticityAttr,
            sheerAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Tank Tops',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2025/10/31/b9/176187507473ce27b9b2823bfbfa710671923f0077_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length'],
          bodyChartColumns: ['Height', 'Bust', 'Waist Size'],
          attributes: [
            {
              name: 'Fit Type',
              type: 'select',
              values: ['Slim Fit / Athletic', 'Regular Fit', 'Oversized', 'Muscle Fit'],
            },
            colorAttr,
            sizeAttr,
            {
              name: 'Neckline',
              type: 'select',
              values: ['Round Neck / Scoop Neck', 'Deep V-Neck', 'Square Neck', 'High Neck'],
            },
            {
              name: 'Pattern Type',
              type: 'select',
              values: [
                'Plain / Solid',
                'Graphic Print',
                'Striped',
                'Camouflage',
                'Letter Print',
                'Colorblock',
              ],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Ribbed Fabric',
                'Deep Armholes (Stringer)',
                'Contrast Binding',
                'Raw Cut Armholes',
                'Chest Pocket',
              ],
            },
            {
              name: 'Length',
              type: 'select',
              values: ['Regular', 'Longline'],
            },
            {
              name: 'Material',
              type: 'select',
              values: ['100% Cotton', 'Ribbed Knit', 'Mesh / Athletic', 'Spandex Blend', 'Modal'],
            },
            fabricElasticityAttr,
            careInstructionsAttr,
            seasonsAttr,
            scenesAttr,
            nepaliFestivalsAttr,
            priceRangeAttr,
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 9. Men Shoes & Footwear
    // ----------------------------------------------------
    {
      name: 'Men Shoes & Footwear',
      imageUrl:
        'https://img.ltwebstatic.com/v4/j/pi/2026/05/18/25/1779085817c918ee911dc258385d0d62f026a7e089_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Sneakers & Athletic Shoes',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/05/18/25/1779085817c918ee911dc258385d0d62f026a7e089_thumbnail_192x.avif',
          sizeChartColumns: ['EU Size', 'Foot Length (CM)', 'US Size', 'UK Size'],
          attributes: [
            shoeSizeAttr,
            colorAttr,
            {
              name: 'Toe Style',
              type: 'select',
              values: ['Round Toe', 'Almond Toe'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Lace-Up', 'Slip-On', 'Velcro / Hook & Loop'],
            },
            {
              name: 'Style',
              type: 'select',
              values: [
                'Chunky / Dad Sneaker',
                'Low-Top Casual',
                'High-Top Sneaker',
                'Running / Athletic',
                'Skate Shoe',
              ],
            },
            {
              name: 'Upper Material',
              type: 'select',
              values: [
                'PU Leather',
                'Breathable Mesh Fabric',
                'Canvas',
                'Genuine Leather',
                'Suede',
              ],
            },
            {
              name: 'Outsole Material',
              type: 'select',
              values: ['Rubber', 'EVA', 'MD', 'TPU'],
            },
            {
              name: 'Insole Material',
              type: 'select',
              values: ['Memory Foam', 'EVA', 'Breathable Fabric', 'Latex'],
            },
            {
              name: 'Heel Height / Type',
              type: 'select',
              values: ['Flat', 'Thick Sole / Platform', 'Low Heel'],
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: [
                'Breathable',
                'Shock Absorption',
                'Anti-Slip',
                'Lightweight',
                'Wear-Resistant',
              ],
            },
            scenesAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Loafers & Dress Shoes',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/04/10/72/177580797171e227096e21fd10bb073f3c4db96c82_thumbnail_192x.avif',
          sizeChartColumns: ['EU Size', 'Foot Length (CM)', 'US Size', 'UK Size'],
          attributes: [
            shoeSizeAttr,
            colorAttr,
            {
              name: 'Type',
              type: 'select',
              values: [
                'Penny Loafers',
                'Tassel Loafers',
                'Oxford Shoes',
                'Derby Shoes',
                'Monk Strap',
                'Driving Shoes',
              ],
            },
            {
              name: 'Toe Style',
              type: 'select',
              values: ['Round Toe', 'Pointed Toe', 'Square Toe', 'Almond Toe'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Slip-On', 'Lace-Up', 'Buckle Strap'],
            },
            {
              name: 'Upper Material',
              type: 'select',
              values: ['Genuine Leather', 'PU Leather', 'Suede / Faux Suede', 'Patent Leather'],
            },
            {
              name: 'Outsole Material',
              type: 'select',
              values: ['Rubber', 'Genuine Leather Sole', 'EVA'],
            },
            {
              name: 'Insole Material',
              type: 'select',
              values: ['Genuine Leather', 'PU', 'Memory Foam'],
            },
            {
              name: 'Heel Height',
              type: 'select',
              values: ['Low Heel (1-3 cm)', 'Flat'],
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                'Brogue Perforations',
                'Tassels',
                'Metal Bit / Buckle',
                'Contrast Stitching',
              ],
            },
            scenesAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Boots',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/04/10/72/177580797171e227096e21fd10bb073f3c4db96c82_thumbnail_192x.avif',
          sizeChartColumns: ['EU Size', 'Foot Length (CM)', 'US Size', 'UK Size'],
          attributes: [
            shoeSizeAttr,
            colorAttr,
            {
              name: 'Type',
              type: 'select',
              values: [
                'Chelsea Boots',
                'Combat / Military Boots',
                'Chukka / Desert Boots',
                'Work Boots',
                'Martin Boots',
              ],
            },
            {
              name: 'Toe Style',
              type: 'select',
              values: ['Round Toe', 'Square Toe', 'Almond Toe'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Side Zipper', 'Elastic Side Goring', 'Lace-Up', 'Buckle'],
            },
            {
              name: 'Upper Material',
              type: 'select',
              values: ['Genuine Leather', 'PU Leather', 'Suede / Nubuck'],
            },
            {
              name: 'Outsole Material',
              type: 'select',
              values: ['Lugged Rubber', 'Commando Sole', 'TPR', 'EVA'],
            },
            {
              name: 'Shaft Height',
              type: 'select',
              values: ['Ankle Boot', 'Mid-Calf'],
            },
            {
              name: 'Lining / Insulation',
              type: 'select',
              values: ['Warm Fleece Lined', 'Leather Lined', 'Breathable Fabric'],
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: ['Anti-Slip', 'Water-Resistant', 'Heavy Duty', 'Shock Absorbing'],
            },
            scenesAttr,
            priceRangeAttr,
          ],
        },
        {
          name: 'Men Slides & Sandals',
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2026/05/18/25/1779085817c918ee911dc258385d0d62f026a7e089_thumbnail_192x.avif',
          sizeChartColumns: ['EU Size', 'Foot Length (CM)', 'US Size', 'UK Size'],
          attributes: [
            shoeSizeAttr,
            colorAttr,
            {
              name: 'Type',
              type: 'select',
              values: [
                'Pool Slides',
                'Dual Strap Sandals',
                'Thong / Flip Flops',
                'Fisherman Sandals',
                'Clogs',
              ],
            },
            {
              name: 'Toe Style',
              type: 'select',
              values: ['Open Toe', 'Round Toe / Closed Toe'],
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['Slip-On', 'Buckle Strap', 'Velcro'],
            },
            {
              name: 'Upper Material',
              type: 'select',
              values: ['EVA', 'PU Leather', 'Webbing Canvas', 'Rubber'],
            },
            {
              name: 'Outsole Material',
              type: 'select',
              values: ['EVA', 'Rubber', 'Cork / Latex'],
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: ['Waterproof', 'Lightweight', 'Cushioning', 'Quick-Drying', 'Anti-Slip'],
            },
            scenesAttr,
            priceRangeAttr,
          ],
        },
      ],
    },
  ],
};

export async function seedCategoriesMen(isReset = false): Promise<void> {
  console.log('\n👔 Seeding Men Category Tree & Comprehensive Shein Attributes...');

  if (isReset) {
    console.log('⚠️ [--reset active] Wiping Category collection in PostgreSQL...');
    await prisma.category.deleteMany({});
  }

  await seedTree(ALL_MEN_CATEGORIES_TREE);
  console.log('✅ Men Categories & Shein Attributes Seeded Successfully!');
}

if (require.main === module) {
  const isReset = process.argv.includes('--reset');
  seedCategoriesMen(isReset).catch((err) => {
    console.error('❌ Seeding Men categories failed:', err);
    process.exit(1);
  });
}
