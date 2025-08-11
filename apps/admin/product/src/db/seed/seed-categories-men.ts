import mongoose, { Types } from 'mongoose';
import slugify from 'slugify';
import path from 'path';
import dotenv from 'dotenv';

// Load env from project env file (development by default)
dotenv.config({
  path:
    process.env.DOTENV_CONFIG_PATH ||
    path.resolve(__dirname, '../../../.env.development'),
});

import { CategoryModel } from '../../db/models/category.model';
import { AttributeModel } from '../../db/models/attribute.model';
import { OptionSetModel } from '../../db/models/option-set.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce';

// Types
type AllowedGroup = 'basic' | 'sale' | 'package' | 'details' | 'termcondition' | 'variant';

interface SeedAttr {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values?: string[];
  isRequired?: boolean;
  isVariant?: boolean;
  variantType?: 'color' | 'size' | null;
  useStandardOptions?: boolean;
  optionSetName?: string; // convenience to resolve optionSetId
  group?: AllowedGroup; // optional explicit group; default inferred
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
  // Default group: variant attributes => 'variant', else 'details'
  const group: AllowedGroup = a.group
    ? a.group
    : a.isVariant
    ? 'variant'
    : 'details';
  return {
    name: a.name,
    type: a.type,
    values: a.values ?? [],
    isRequired: a.isRequired ?? false,
    isVariant: !!a.isVariant,
    variantType: a.variantType ?? null,
    useStandardOptions: !!a.useStandardOptions,
    optionSetId: a.optionSetId ?? null,
    group,
  };
}

async function ensureCategory(parent: any | null, name: string) {
  const slug = slugify(name, { lower: true, strict: true });
  const level = parent ? (parent.level || 1) + 1 : 1;
  const pathParts = parent ? [...(parent.path || []), slug] : [slug];
  // Upsert so reseeding keeps structure consistent
  const res = await CategoryModel.findOneAndUpdate(
    { name },
    { name, slug, level, parent: parent?._id || null, path: pathParts },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return res;
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

  // Upsert by (categoryId, name). Optionally clear missing attributes if CLEAR_MISSING=1
  const namesInSeed = new Set(withIds.map((a) => a.name));
  for (const attr of withIds) {
    await AttributeModel.updateOne(
      { categoryId, name: attr.name },
      { categoryId, ...attr } as any,
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  if (process.env.CLEAR_MISSING === '1') {
    await AttributeModel.deleteMany({ categoryId, name: { $nin: Array.from(namesInSeed) } });
  }
}

async function seedTree(root: SeedCategory) {
  // Ensure default option sets exist (in case seeding order differs)
  const defaults = [
    { name: 'Basic Colors', type: 'color', values: ['Black','White','Red','Blue','Green','Yellow','Gray','Pink','Purple','Brown'] },
    { name: 'Alpha Sizes (XS-XXL)', type: 'size', values: ['XS','S','M','L','XL','XXL'] },
    { name: 'Numeric Sizes (28-44)', type: 'size', values: ['28','30','32','34','36','38','40','42','44'] },
    { name: 'US Shoe Sizes (Men)', type: 'size', values: ['6','7','8','9','10','11','12','13'] },
  ];
  for (const set of defaults) {
    await OptionSetModel.updateOne(
      { name: set.name },
      set as any,
      { upsert: true, setDefaultsOnInsert: true },
    );
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
            { name: 'Pattern Type', type: 'select', values: ['Plain','Striped','Graphic','Colorblock','Plaid','All Over Print'] },
            { name: 'Style', type: 'select', values: ['Casual','Street','Sporty','Minimalist'] },
            { name: 'Neckline', type: 'select', values: ['Crew Neck','V Neck','Polo Collar','Henley','Scoop'] },
            { name: 'Fit Type', type: 'select', values: ['Slim','Regular','Oversized','Relaxed'] },
            { name: 'Length', type: 'select', values: ['Regular','Cropped','Longline'] },
            { name: 'Fabric Elasticity', type: 'select', values: ['Non-Stretch','Slight Stretch','Medium Stretch','High Stretch'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Spandex','Linen','Viscose','Blend'] },
            { name: 'Details', type: 'multiselect', values: ['Pocket','Zipper','Button','Embroidery','Applique'] },
            { name: 'Occasion', type: 'multiselect', values: ['Casual','Work','Vacation','Party','Sports','Street'] },
          ],
        },
        {
          name: 'Shirts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve','Long Sleeve'] },
            { name: 'Fit', type: 'select', values: ['Slim','Regular','Relaxed'] },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Plaid','Striped','All Over Print','Colorblock'] },
            { name: 'Collar Type', type: 'select', values: ['Spread','Button-Down','Mandarin','Cuban','Stand'] },
            { name: 'Fabric Elasticity', type: 'select', values: ['Non-Stretch','Slight Stretch'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Linen','Viscose','Blend'] },
            { name: 'Style', type: 'select', values: ['Casual','Smart Casual','Formal'] },
          ],
        },
        {
          name: 'Polos',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Striped','Colorblock'] },
            { name: 'Fit Type', type: 'select', values: ['Slim','Regular','Relaxed'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Pique','Blend'] },
          ],
        },
        {
          name: 'Hoodies & Sweatshirts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Style', type: 'select', values: ['Hoodie','Sweatshirt','Zip-Up'] },
            { name: 'Thickness', type: 'select', values: ['Lightweight','Midweight','Heavyweight'] },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Graphic','Colorblock','Striped'] },
            { name: 'Fabric Elasticity', type: 'select', values: ['Non-Stretch','Slight Stretch','Medium Stretch'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Fleece','Blend'] },
          ],
        },
        {
          name: 'Sweaters & Cardigans',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Neckline', type: 'select', values: ['Crew Neck','V Neck','Turtleneck','Half-Zip'] },
            { name: 'Material', type: 'select', values: ['Cotton','Acrylic','Wool','Blend'] },
            { name: 'Fabric Elasticity', type: 'select', values: ['Non-Stretch','Slight Stretch','Medium Stretch'] },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Cable Knit','Striped','Colorblock','Argyle'] },
          ],
        },
        {
          name: 'Jackets & Coats',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Type', type: 'select', values: ['Denim','Bomber','Puffer','Trench','Leather','Varsity','Windbreaker'] },
            { name: 'Closure', type: 'select', values: ['Zip','Buttons','Snap','Open'] },
            { name: 'Thickness', type: 'select', values: ['Lightweight','Midweight','Heavyweight'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Nylon','Leather','Denim','Blend'] },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Colorblock','Plaid'] },
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
            { name: 'Wash', type: 'select', values: ['Light','Medium','Dark','Black','Acid'] },
            { name: 'Length', type: 'select', values: ['Full Length','Cropped'] },
            { name: 'Rise', type: 'select', values: ['Low','Mid','High'] },
            { name: 'Stretch', type: 'select', values: ['Non-Stretch','Slight Stretch','Stretch'] },
            { name: 'Details', type: 'multiselect', values: ['Ripped','Distressed','Cargo Pockets','Whiskering'] },
            { name: 'Closure', type: 'select', values: ['Zipper Fly','Button Fly'] },
            { name: 'Material', type: 'select', values: ['Denim','Cotton Blend'] },
            { name: 'Inseam (in)', type: 'number' },
          ],
        },
        {
          name: 'Pants',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Waist Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Numeric Sizes (28-44)' },
            { name: 'Type', type: 'select', values: ['Chinos','Dress Pants','Cargo','Jogger','Sweatpants'] },
            { name: 'Fit Type', type: 'select', values: ['Slim','Regular','Relaxed','Tapered'] },
            { name: 'Length', type: 'select', values: ['Full Length','Cropped','Short'] },
            { name: 'Rise', type: 'select', values: ['Low','Mid','High'] },
            { name: 'Closure', type: 'select', values: ['Drawstring','Button','Zipper','Elastic Waist'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Linen','Nylon','Blend'] },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Plaid','Striped','Camouflage'] },
          ],
        },
        {
          name: 'Shorts',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Type', type: 'select', values: ['Chino','Athletic','Cargo','Denim','Swim'] },
            { name: 'Length', type: 'select', values: ['Above Knee','Knee Length','Long'] },
            { name: 'Waist Type', type: 'select', values: ['Elastic','Drawstring','Fixed Waist'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Nylon','Denim','Blend'] },
            { name: 'Pattern Type', type: 'select', values: ['Plain','Plaid','Striped','All Over Print','Camouflage'] },
          ],
        },
        {
          name: 'Joggers',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Fit Type', type: 'select', values: ['Slim','Regular','Relaxed'] },
            { name: 'Cuff', type: 'select', values: ['Elastic Cuff','Open Hem'] },
            { name: 'Material', type: 'select', values: ['Cotton','Polyester','Fleece','Nylon','Blend'] },
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
        { name: 'Type', type: 'select', values: ['Suit Set','Blazer','Dress Vest'] },
        { name: 'Closure', type: 'select', values: ['Single-Breasted','Double-Breasted'] },
        { name: 'Pattern Type', type: 'select', values: ['Plain','Plaid','Striped'] },
        { name: 'Material', type: 'select', values: ['Polyester','Viscose','Wool','Blend'] },
      ],
    },
    {
      name: 'Sets & Co-ords',
      attributes: [
        { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
        { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
        { name: 'Pattern Type', type: 'select', values: ['Plain','Striped','Plaid','All Over Print','Colorblock'] },
        { name: 'Style', type: 'select', values: ['Casual','Sporty','Street'] },
        { name: 'Material', type: 'select', values: ['Cotton','Polyester','Nylon','Blend'] },
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
            { name: 'Fabric Features', type: 'multiselect', values: ['Quick-Dry','Breathable','Moisture Wicking','Anti-Odor'] },
            { name: 'Fabric Elasticity', type: 'select', values: ['Slight Stretch','Medium Stretch','High Stretch'] },
          ],
        },
        {
          name: 'Active Bottoms',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
            { name: 'Type', type: 'select', values: ['Shorts','Joggers','Leggings'] },
            { name: 'Fabric Features', type: 'multiselect', values: ['Quick-Dry','Breathable','Moisture Wicking','Anti-Odor'] },
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
      { name: 'Rise', type: 'select', values: ['Low','Mid','High'] },
      { name: 'Material', type: 'select', values: ['Cotton','Modal','Polyester','Spandex','Blend'] },
      { name: 'Pack Count', type: 'number' },
          ],
        },
        {
          name: 'Sleepwear',
          attributes: [
            { name: 'Color', type: 'select', isVariant: false, variantType: null, useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Alpha Sizes (XS-XXL)' },
      { name: 'Type', type: 'select', values: ['Pajama Set','Nightshirt','Lounge Set'] },
      { name: 'Material', type: 'select', values: ['Cotton','Polyester','Satin','Flannel','Blend'] },
          ],
        },
        {
          name: 'Socks',
          attributes: [
            { name: 'Color', type: 'select', isVariant: false, variantType: null, useStandardOptions: true, optionSetName: 'Basic Colors' },
      { name: 'Size', type: 'select', isVariant: false, variantType: null, values: ['One Size','M','L'] },
      { name: 'Length', type: 'select', values: ['No-Show','Ankle','Crew','Knee High'] },
      { name: 'Material', type: 'select', values: ['Cotton','Polyester','Nylon','Wool','Blend'] },
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
    { name: 'Length', type: 'select', values: ['Short','Mid','Long'] },
    { name: 'Waist Type', type: 'select', values: ['Drawstring','Elastic','Fixed Waist'] },
    { name: 'Liner', type: 'select', values: ['Mesh Liner','No Liner'] },
    { name: 'Pattern Type', type: 'select', values: ['Plain','Striped','All Over Print','Colorblock'] },
      ],
    },
    {
      name: 'Shoes',
      children: [
        {
          name: 'Sneakers',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'US Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'US Shoe Sizes (Men)' },
            { name: 'Upper Material', type: 'select', values: ['Mesh','Leather','PU','Canvas','Suede','Knit'] },
            { name: 'Closure Type', type: 'select', values: ['Lace-Up','Slip-On','Velcro'] },
          ],
        },
        {
          name: 'Boots',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'US Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'US Shoe Sizes (Men)' },
            { name: 'Upper Material', type: 'select', values: ['Leather','PU','Suede','Canvas'] },
            { name: 'Closure Type', type: 'select', values: ['Lace-Up','Zip','Slip-On'] },
          ],
        },
        {
          name: 'Sandals & Slides',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'US Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'US Shoe Sizes (Men)' },
            { name: 'Upper Material', type: 'select', values: ['PU','Rubber','Mesh','Canvas'] },
            { name: 'Closure Type', type: 'select', values: ['Slip-On','Hook & Loop','Buckle'] },
          ],
        },
        {
          name: 'Loafers',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'US Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'US Shoe Sizes (Men)' },
            { name: 'Upper Material', type: 'select', values: ['Leather','PU','Suede'] },
          ],
        },
        {
          name: 'Dress Shoes',
          attributes: [
            { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' },
            { name: 'US Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'US Shoe Sizes (Men)' },
            { name: 'Upper Material', type: 'select', values: ['Leather','PU','Suede'] },
            { name: 'Closure Type', type: 'select', values: ['Lace-Up','Slip-On','Buckle'] },
          ],
        },
      ],
    },
    {
      name: 'Accessories',
      children: [
  { name: 'Bags', attributes: [ { name: 'Color', type: 'select', values: ['Black','Brown','Gray','Blue'] }, { name: 'Material', type: 'select', values: ['PU','Leather','Canvas','Nylon'] } ] },
  { name: 'Belts', attributes: [ { name: 'Color', type: 'select', values: ['Black','Brown','Tan'] }, { name: 'Material', type: 'select', values: ['Leather','PU','Fabric'] } ] },
  { name: 'Hats', attributes: [ { name: 'Color', type: 'select', values: ['Black','White','Gray','Navy','Khaki'] }, { name: 'Type', type: 'select', values: ['Baseball Cap','Beanie','Bucket','Fedora'] } ] },
  { name: 'Sunglasses', attributes: [ { name: 'Color', type: 'select', values: ['Black','Brown','Silver','Gold'] }, { name: 'Frame Shape', type: 'select', values: ['Aviator','Wayfarer','Round','Square'] } ] },
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
