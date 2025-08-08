import mongoose, { Types } from 'mongoose';
import slugify from 'slugify';
import path from 'path';
import dotenv from 'dotenv';

// Load env from project env file (development by default)
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development') });

import { CategoryModel } from '../../db/models/category.model';
import { AttributeModel } from '../../db/models/attribute.model';
import { OptionSetModel } from '../../db/models/option-set.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce';

// Types
interface SeedAttr {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values?: string[];
  isRequired?: boolean;
  isVariant?: boolean;
  variantType?: 'color' | 'size' | null;
  useStandardOptions?: boolean;
  optionSetName?: string; // convenience to resolve optionSetId
}

interface SeedCategory {
  name: string;
  attributes?: SeedAttr[];
  children?: SeedCategory[];
}

// Helpers to get option set ids by name
async function getOptionSetIdByName(name: string): Promise<Types.ObjectId | null> {
  const set = await OptionSetModel.findOne({ name });
  return set ? (set._id as Types.ObjectId) : null;
}

function mkAttr(a: SeedAttr & { optionSetId?: Types.ObjectId | null }) {
  return {
    name: a.name,
    type: a.type,
    values: a.values ?? [],
    isRequired: a.isRequired ?? false,
    isVariant: !!a.isVariant,
    variantType: a.variantType ?? null,
    useStandardOptions: !!a.useStandardOptions,
    optionSetId: a.optionSetId ?? null,
  };
}

async function ensureCategory(parent: any | null, name: string) {
  const existing = await CategoryModel.findOne({ name });
  if (existing) return existing;
  const slug = slugify(name, { lower: true, strict: true });
  const level = parent ? (parent.level || 1) + 1 : 1;
  const pathParts = parent ? [...(parent.path || []), slug] : [slug];
  return CategoryModel.create({ name, slug, level, parent: parent?._id || null, path: pathParts });
}

async function createAttributes(categoryId: Types.ObjectId, attrs: SeedAttr[]) {
  // resolve any optionSetName to optionSetId
  const withIds = await Promise.all(
    attrs.map(async (a) => {
      let optionSetId: Types.ObjectId | null = null;
      if (a.useStandardOptions && a.optionSetName) {
        optionSetId = await getOptionSetIdByName(a.optionSetName);
      }
      return mkAttr({ ...a, optionSetId });
    })
  );

  // idempotent-ish: upsert by (categoryId, name)
  for (const attr of withIds) {
    const existing = await AttributeModel.findOne({ categoryId, name: attr.name });
    if (existing) {
      await AttributeModel.updateOne({ _id: existing._id }, attr);
    } else {
      await AttributeModel.create({ categoryId, ...attr });
    }
  }
}

async function seedTree(root: SeedCategory) {
  // Ensure default option sets exist (in case seeding order differs)
  const defaults = [
    { name: 'Basic Colors', type: 'color', values: ['Black','White','Red','Blue','Green','Yellow','Gray','Pink','Purple','Brown'] },
    { name: 'Alpha Sizes (XS-XXL)', type: 'size', values: ['XS','S','M','L','XL','XXL'] },
    { name: 'Numeric Sizes (28-44)', type: 'size', values: ['28','30','32','34','36','38','40','42','44'] },
  ];
  for (const set of defaults) {
    await OptionSetModel.updateOne({ name: set.name }, set as any, { upsert: true });
  }

  async function walk(node: SeedCategory, parent: any | null) {
    const cat = await ensureCategory(parent, node.name);
    if (node.attributes?.length) {
      await createAttributes(cat._id as Types.ObjectId, node.attributes);
    }
    if (node.children?.length) {
      for (const child of node.children) {
        await walk(child, cat);
      }
    }
  }

  await walk(root, null);
}

// Define Men tree
const MEN_TREE: SeedCategory = {
  name: 'Men',
  children: [
    {
      name: 'Tops',
      children: [
        {
          name: 'T-Shirts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve','Long Sleeve','Sleeveless'] },
            { name: 'Pattern', type: 'select', values: ['Solid','Striped','Graphic','Colorblock','Plaid'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Linen','Blend'] },
          ],
        },
        {
          name: 'Shirts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve','Long Sleeve'] },
            { name: 'Fit', type: 'select', values: ['Slim','Regular','Relaxed'] },
            { name: 'Pattern', type: 'select', values: ['Solid','Plaid','Striped'] },
          ],
        },
        {
          name: 'Polos',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Pattern', type: 'select', values: ['Solid','Striped','Colorblock'] },
          ],
        },
        {
          name: 'Hoodies & Sweatshirts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Style', type: 'select', values: ['Hoodie','Sweatshirt','Zip-Up'] },
          ],
        },
        {
          name: 'Sweaters & Cardigans',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Neck', type: 'select', values: ['Crew','V-Neck','Turtle'] },
          ],
        },
        {
          name: 'Jackets & Coats',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Type', type: 'select', values: ['Denim','Bomber','Puffer','Trench'] },
          ],
        },
      ],
    },
    {
      name: 'Bottoms',
      children: [
        {
          name: 'Jeans',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Waist Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Numeric Sizes (28-44)' },
            { name: 'Fit', type: 'select', values: ['Skinny','Slim','Straight','Relaxed','Baggy'] },
            { name: 'Wash', type: 'select', values: ['Light','Medium','Dark','Black'] },
          ],
        },
        {
          name: 'Pants',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Waist Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Numeric Sizes (28-44)' },
            { name: 'Type', type: 'select', values: ['Chinos','Dress Pants','Cargo','Jogger'] },
          ],
        },
        {
          name: 'Shorts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Type', type: 'select', values: ['Chino','Athletic','Cargo','Denim'] },
          ],
        },
        {
          name: 'Joggers',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
          ],
        },
      ],
    },
    {
      name: 'Suits & Blazers',
      attributes: [
        { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
        { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
        { name: 'Fit', type: 'select', values: ['Slim','Regular','Relaxed'] },
      ],
    },
    {
      name: 'Activewear',
      children: [
        {
          name: 'Active Tops',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
          ],
        },
        {
          name: 'Active Bottoms',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
          ],
        },
      ],
    },
    {
      name: 'Underwear & Sleepwear',
      children: [
        {
          name: 'Underwear',
          attributes: [
            { name: 'Color', type: 'select', isVariant: false, variantType: null, useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Type', type: 'select', values: ['Briefs','Boxers','Trunks'] },
          ],
        },
        {
          name: 'Sleepwear',
          attributes: [
            { name: 'Color', type: 'select', isVariant: false, variantType: null, useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
          ],
        },
        {
          name: 'Socks',
          attributes: [
            { name: 'Color', type: 'select', isVariant: false, variantType: null, useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: false, variantType: null, values: ['One Size','M','L'] },
          ],
        },
      ],
    },
    {
      name: 'Swimwear',
      attributes: [
        { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
        { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
        { name: 'Type', type: 'select', values: ['Trunks','Briefs','Boardshorts'] },
      ],
    },
    {
      name: 'Shoes',
      children: [
        {
          name: 'Sneakers',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', values: ['40','41','42','43','44','45','46'] },
          ],
        },
        {
          name: 'Boots',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', values: ['40','41','42','43','44','45','46'] },
          ],
        },
        {
          name: 'Sandals & Slides',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', values: ['40','41','42','43','44','45','46'] },
          ],
        },
        {
          name: 'Loafers',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', values: ['40','41','42','43','44','45','46'] },
          ],
        },
        {
          name: 'Dress Shoes',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', values: ['40','41','42','43','44','45','46'] },
          ],
        },
      ],
    },
    {
      name: 'Accessories',
      children: [
        { name: 'Bags', attributes: [ { name: 'Color', type: 'select', values: ['Black','Brown','Gray','Blue'] } ] },
        { name: 'Belts', attributes: [ { name: 'Color', type: 'select', values: ['Black','Brown','Tan'] } ] },
        { name: 'Scarves & Gloves', attributes: [ { name: 'Color', type: 'select', values: ['Black','Gray','Navy'] } ] },
      ],
    },
  ],
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  try {
    await seedTree(MEN_TREE);
    // eslint-disable-next-line no-console
    console.log('Seeded Men categories and attributes.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
