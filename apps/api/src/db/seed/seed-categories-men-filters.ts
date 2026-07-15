import mongoose, { Types } from 'mongoose';
import slugify from 'slugify';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development'),
});

import { CategoryModel } from '@/db/models/category.model';
import { AttributeModel } from '@/db/models/attribute.model';
import { OptionSetModel } from '@/db/models/option-set.model';
import { CategoryFilterModel } from '@/db/models/category-filter.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce';

type AllowedGroup = 'basic' | 'sale' | 'package' | 'details' | 'termcondition' | 'variant';

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
  
  // CategoryFilter specific
  filterUiType?: 'checkbox' | 'color_swatch' | 'size_box' | 'range_slider';
  isStorefrontFilter?: boolean; // defaults to true unless explicitly false
}

interface SeedCategory {
  name: string;
  sizeChartColumns?: string[];
  attributes?: SeedAttr[];
  children?: SeedCategory[];
}

// Helpers
async function getOptionSetIdByName(name: string): Promise<Types.ObjectId | null> {
  const set = await OptionSetModel.findOne({ name });
  return set ? (set._id as Types.ObjectId) : null;
}

function mkAttr(a: SeedAttr & { optionSetId?: Types.ObjectId | null }) {
  const group: AllowedGroup = a.group
    ? a.group
    : a.isVariant
    ? 'variant'
    : 'details';
  const coercedType: SeedAttr['type'] =
    a.isVariant && (a.variantType === 'color' || a.variantType === 'size')
      ? 'multiselect'
      : a.type;
  return {
    name: a.name,
    type: coercedType,
    values: a.values ?? [],
    isRequired: a.isRequired ?? false,
    isVariant: !!a.isVariant,
    variantType: a.variantType ?? null,
    useStandardOptions: !!a.useStandardOptions,
    optionSetId: a.optionSetId ?? null,
    group,
  };
}

async function ensureCategory(parent: any | null, name: string, sizeChartColumns?: string[]) {
  const slug = slugify(name, { lower: true, strict: true });
  const level = parent ? (parent.level || 1) + 1 : 1;
  const pathParts = parent ? [...(parent.path || []), slug] : [slug];
  const res = await CategoryModel.findOneAndUpdate(
    { name, parentCategory: parent?._id || null },
    { 
      name, 
      slug, 
      level, 
      parentCategory: parent?._id || null, 
      path: pathParts,
      ...(sizeChartColumns ? { sizeChartColumns } : {})
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return res;
}

async function createAttributesAndFilters(categoryId: Types.ObjectId, attrs: SeedAttr[]) {
  let displayOrder = 0;
  for (const a of attrs) {
    let optionSetId: Types.ObjectId | null = null;
    if (a.useStandardOptions && a.optionSetName) {
      optionSetId = await getOptionSetIdByName(a.optionSetName);
    }
    
    const attrData = mkAttr({ ...a, optionSetId });
    
    // 1. Create Attribute
    const attrDoc = await AttributeModel.findOneAndUpdate(
      { categoryId, name: attrData.name },
      { categoryId, ...attrData } as any,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // 2. Create CategoryFilter if applicable
    const isStorefrontFilter = a.isStorefrontFilter !== false; // defaults to true
    if (isStorefrontFilter) {
      const defaultUiType = 
        a.filterUiType ? a.filterUiType :
        attrData.variantType === 'color' ? 'color_swatch' :
        attrData.variantType === 'size' ? 'size_box' :
        attrData.type === 'number' ? 'range_slider' :
        'checkbox';
        
      await CategoryFilterModel.findOneAndUpdate(
        { categoryId, attributeId: attrDoc._id },
        {
          categoryId,
          attributeId: attrDoc._id,
          displayName: attrData.name,
          uiType: defaultUiType,
          displayOrder: displayOrder++,
          isMultiSelect: true,
          isSearchable: (attrData.values && attrData.values.length > 10) || false,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }
  }
}

async function seedTree(root: SeedCategory) {
  // Ensure default option sets exist
  const defaults = [
    {
      name: 'Basic Colors',
      type: 'color',
      values: [
        'White', 'Ivory', 'Cream', 'Off-White', 'Pearl', 'Vanilla', 'Alabaster',
        'Beige', 'Khaki', 'Camel', 'Taupe', 'Sand', 'Apricot', 'Oatmeal', 'Mocha', 'Coffee', 'Chocolate', 'Chestnut', 'Caramel', 'Cocoa',
        'Light Grey', 'Dark Grey', 'Charcoal', 'Slate', 'Ash', 'Heather Grey', 'Silver',
        'Black', 'Obsidian', 'Jet Black',
        'Red', 'Burgundy', 'Maroon', 'Wine', 'Crimson', 'Cherry', 'Brick Red', 'Tomato Red', 'Ruby', 'Scarlet',
        'Pink', 'Baby Pink', 'Hot Pink', 'Fuchsia', 'Magenta', 'Rose', 'Dusty Rose', 'Blush', 'Bubblegum', 'Coral', 'Peach', 'Salmon',
        'Orange', 'Burnt Orange', 'Neon Orange', 'Tangerine', 'Rust Orange', 'Papaya',
        'Yellow', 'Mustard', 'Lemon', 'Neon Yellow', 'Gold', 'Amber', 'Butter Yellow', 'Sunflower',
        'Mint', 'Seafoam', 'Sage', 'Lime', 'Neon Green', 'Chartreuse', 'Pistachio',
        'Army Green', 'Olive', 'Khaki Green', 'Emerald', 'Forest Green', 'Hunter Green', 'Kelly Green', 'Pine', 'Avocado',
        'Baby Blue', 'Sky Blue', 'Ice Blue', 'Aqua', 'Cyan', 'Powder Blue',
        'Navy Blue', 'Royal Blue', 'Cobalt', 'Indigo', 'Sapphire', 'Denim Blue', 'Midnight Blue',
        'Turquoise', 'Teal', 'Peacock Blue',
        'Purple', 'Lilac', 'Lavender', 'Violet', 'Plum', 'Eggplant', 'Mauve', 'Amethyst', 'Orchid',
        'Rose Gold', 'Bronze', 'Copper',
        'Multicolor', 'Rainbow', 'Tie-Dye', 'Leopard Print', 'Floral', 'Geometric', 'Clear/Transparent'
      ]
    },
    { name: 'Extended Sizes', type: 'size', values: ['Alpha XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'BR M', 'Alpha (Curve) 2XL', '3XL', '4XL', '5XL'] },
  ];
  for (const set of defaults) {
    await OptionSetModel.updateOne(
      { name: set.name },
      set as any,
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  async function walk(node: SeedCategory, parent: any | null) {
    const cat = await ensureCategory(parent, node.name, node.sizeChartColumns);
    if (node.attributes?.length) {
      await createAttributesAndFilters(cat._id as Types.ObjectId, node.attributes);
    }
    if (node.children?.length) {
      for (const child of node.children) {
        await walk(child, cat);
      }
    }
  }

  await walk(root, null);
}

// ---------------------------------------------------------
// Tree Definition from the document
// ---------------------------------------------------------
const colorAttr: SeedAttr = { name: 'Color', type: 'select', isVariant: true, variantType: 'color', useStandardOptions: true, optionSetName: 'Basic Colors' };
const sizeAttr: SeedAttr = { name: 'Size', type: 'select', isVariant: true, variantType: 'size', useStandardOptions: true, optionSetName: 'Extended Sizes' };
const priceRangeAttr: SeedAttr = { name: 'Price Range', type: 'number', isVariant: false, isStorefrontFilter: true, filterUiType: 'range_slider' };

const NEW_MEN_TREE: SeedCategory = {
  name: 'Men',
  children: [
    // 1. Men Denim
    {
      name: 'Men Denim',
      children: [
        {
          name: 'Men Denim Jackets',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            { name: 'Type', type: 'select', values: ['Shacket', 'Windbreaker', 'Other', 'Vest', 'Teddy'] },
            colorAttr, sizeAttr,
            { name: 'Length', type: 'select', values: ['Long', 'Midi', 'Crop', 'Knee Length'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring', 'Embroidery', 'Ripped', 'Contrast Sequin', 'Split', 'Raw Hem', 'Side Stripe', 'Rib-Knit', 'Belted', 'Sheer', 'Washed', 'Fringe', '2 in 1', 'Patched', 'Button Front', 'Zipper', 'Raw Wash', 'Rhinestone', 'Studded', 'Tape', 'Beaded'] },
            { name: 'Pattern Type', type: 'select', values: ['Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Wrist-Length Sleeve', 'Sleeveless', 'Half Sleeve', 'Short Sleeve', 'Three Quarter Length Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Great quality', 'High Stretch', 'Anti Wrinkle', 'Comfortable'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Drop Shoulder', 'Raglan Sleeve'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Valentine\'s Day', 'Thanksgiving Day', 'Independence Day', 'Pride Month'] },
            { name: 'Ideal For', type: 'select', values: ['Conventional', 'Unisex', 'Family Man', 'Couple Male'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Denim Tops',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            { name: 'Type', type: 'select', values: ['Top', 'Other'] },
            colorAttr, sizeAttr,
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring', 'Embroidery', 'Ripped', 'High Low', 'Contrast Sequin', 'Split', 'Raw Hem', 'Side Stripe', 'Bow', 'Asymmetrical', 'Rib-Knit', 'Frill', 'Belted', 'Sheer', 'Lace Up', 'Fringe', 'Patched', 'Appliques', 'Button Front', 'Zipper', 'Eyelet Embroidery', 'Contrast Piping', 'Contrast Lace', 'Rhinestone', 'Chain', 'Studded', 'Grommet Eyelet', 'Tape', 'Beaded', 'Backless'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Geometric'] },
            { name: 'Neckline', type: 'select', values: ['Deep V Neck', 'Square Neck'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Half Sleeve', 'Short Sleeve', 'Wrist-Length Sleeve', 'Sleeveless', 'Three Quarter Length Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Great quality', 'Comfortable', 'Soft & Lightweight', 'Skin-friendly'] },
            { name: 'Sleeve Type', type: 'select', values: ['Drop Shoulder', 'Regular Sleeve', 'Batwing Sleeve', 'Raglan Sleeve', 'Shirt Sleeve', 'Split Sleeve'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Denim Shorts',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Regular Fit', 'Skinny', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring', 'Double Button', 'Embroidery', 'Ripped', 'Paperbag Waist', 'Contrast Mesh', 'Contrast Sequin', 'Split', 'Ruched', 'Raw Hem', 'Side Stripe', 'Asymmetrical', 'Cut Out', 'Rib-Knit', 'Belted', 'Sheer', 'Washed', 'Lace Up', 'Fringe', 'Patched', 'Appliques', 'Button Front', 'Pleated', 'Zipper', 'Cable-knit', 'Raw Wash', 'Rhinestone', 'Chain', 'Studded', 'Grommet Eyelet', 'Split Thigh', 'Tape'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Snakeskin Print', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Soft', 'Lightweight', 'Skin-friendly', 'Non See-Through'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Spring Festival', 'Ramadan', 'Valentine\'s Day', 'Thanksgiving Day'] },
            { name: 'Ideal For', type: 'select', values: ['Conventional', 'Unisex', 'Family Man', 'Couple Male', 'LGBTQ', 'Family/Couples'] },
            { name: 'Scenes', type: 'multiselect', values: ['Street', 'Daily', 'School', 'Outdoor', 'Vacation', 'Party'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Jeans',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Regular Fit', 'Skinny', 'Loose'] },
            { name: 'Type', type: 'select', values: ['Skinny', 'Harem/Genie', 'Wide Leg'] },
            colorAttr, sizeAttr,
            { name: 'Length', type: 'select', values: ['Long', 'Extra Long', 'Cropped'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring', 'Contrast Faux Fur', 'Double Button', 'Embroidery', 'Ripped', 'Paperbag Waist', 'High Low', 'Contrast Sequin', 'Split', 'Fuzzy', 'Ruched', 'Raw Hem', 'Side Stripe', 'Bow', 'Asymmetrical', 'Cut Out', 'Draped', 'Rib-Knit', 'Belted', 'Sheer', 'Washed', 'Lace Up', 'Wrap', 'Patched', 'Appliques', 'Button Front', 'Zipper', 'Ruffle', 'Contrast Piping', 'Raw Wash', 'Contrast Lace', 'Rhinestone', 'Chain', 'Studded', 'Grommet Eyelet', 'Tape', 'Beaded'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Soft', 'Stretch', 'Lightweight', 'Anti Wrinkle'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Valentine\'s Day', 'Thanksgiving Day', 'Father\'s Day', 'Ramadan'] },
            { name: 'Ideal For', type: 'select', values: ['Conventional', 'Unisex', 'Family Man', 'Couple Male', 'LGBTQ'] },
            { name: 'Scenes', type: 'multiselect', values: ['Daily', 'Street', 'School', 'Outdoor', 'Holiday', 'Home'] },
            { name: 'Season', type: 'select', values: ['All', 'Summer', 'Spring/Fall', 'Winter', 'Fall', 'Spring'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 2. Men Bottoms
    {
      name: 'Men Bottoms',
      children: [
        {
          name: 'Men Shorts',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Regular Fit', 'Skinny', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Lace', 'Knitwear', 'Composite Fabric', 'Polyester', 'Sequins'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Scallop', 'Contrast Binding', 'Tie Front', 'Pearls', 'Drawstring', 'Ruffle Hem', 'Double Button', 'Embroidery', 'Contrast Collar', 'Ripped', 'Paperbag Waist', 'Pom Pom', 'Contrast Mesh', 'Contrast Sequin', 'Split', 'Waffle Knit', 'Fake Drawstring', 'Plicated', 'Raw Hem', 'Side Stripe', 'Asymmetrical', 'Cut Out', 'Rib-Knit', 'Shirred', 'Belted', 'Sheer', 'Lace Up', 'Lettuce Trim', 'Fringe', '2 in 1', 'Wrap', 'Patched', 'Appliques', 'Tie Back', 'Button Front', 'Pleated', 'Zipper', 'Ruffle', 'Eyelet Embroidery', 'Contrast Piping', 'Contrast Lace', 'Rhinestone', 'Textured', 'Chain', 'Studded', 'Tassel', 'Grommet Eyelet', 'Tape', 'Beaded', 'Backless'] },
            { name: 'Pattern Type', type: 'select', values: ['Chevron', 'Baroque', 'Polka Dot', 'Tie Dye', 'Geometric'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Soft', 'Lightweight', 'Skin-friendly', 'Non See-Through'] },
            { name: 'Occasion', type: 'multiselect', values: ['Daily', 'Weekend Casual', 'Going Out', 'Beach', 'Sports', 'Holiday'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Spring Festival', 'Independence Day', 'Valentine\'s Day', 'New Year'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Pants',
          attributes: [
            { name: 'Style', type: 'select', values: ['Street', 'Casual'] },
            { name: 'Fit Type', type: 'select', values: ['Regular Fit', 'Skinny', 'Loose'] },
            { name: 'Type', type: 'select', values: ['Skinny', 'Harem/Genie', 'Wide Leg'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Lace', 'Knitwear', 'Composite Fabric', 'Canvas', 'Polyester', 'Sequins'] },
            { name: 'Length', type: 'select', values: ['Long', 'Extra Long', 'Bermuda shorts', 'Cropped'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Tie Front', 'Pearls', 'Drawstring', 'Ruffle Hem', 'Double Button', 'Embroidery', 'Ripped', 'Paperbag Waist', 'Contrast Mesh', 'Contrast Sequin', 'Ribbon', 'Split', 'Twist', 'Fuzzy', 'Ruched', 'Plicated', 'Raw Hem', 'Side Stripe', 'Asymmetrical', 'Cut Out', 'Ring', 'Rib-Knit', 'Belted', 'Sheer', 'Lace Up', 'Fringe', 'Wrap', 'Patched', 'Button Front', 'Pleated', 'Zipper', 'Eyelet Embroidery', 'Cable-knit', 'Contrast Piping', 'Contrast Lace', 'Rhinestone', 'Textured', 'Chain', 'Studded', 'Grommet Eyelet', 'Split Thigh', 'Tape', 'Backless'] },
            { name: 'Pattern Type', type: 'select', values: ['Scarf Print', 'Baroque', 'Tie Dye', 'Geometric'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Soft', 'Lightweight', 'Skin-friendly', 'Anti Wrinkle'] },
            { name: 'Occasion', type: 'multiselect', values: ['Daily', 'Weekend Casual', 'Going Out', 'Night Out', 'Holiday', 'Sports'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Valentine\'s Day', 'Spring Festival', 'Thanksgiving Day', 'Father\'s Day'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Sweatpants',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Regular Fit', 'Skinny', 'Loose'] },
            { name: 'Type', type: 'select', values: ['Skinny', 'Harem/Genie', 'Wide Leg'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Composite Fabric', 'Polyester'] },
            { name: 'Length', type: 'select', values: ['Long', 'Extra Long', 'Bermuda shorts', 'Cropped'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Tie Front', 'Pearls'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Polka Dot', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Features', type: 'multiselect', values: ['Soft', 'Great quality', 'Comfortable', 'Warming'] },
            { name: 'Occasion', type: 'multiselect', values: ['Daily', 'Weekend Casual', 'Going Out', 'Sports', 'Night Out', 'Holiday'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Spring Festival', 'Thanksgiving Day', 'Valentine\'s Day', 'International Workers\' Day'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 3. Men Hoodies & Sweatshirts
    {
      name: 'Men Hoodies & Sweatshirts',
      children: [
        {
          name: 'Men Sweatshirts',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Composite Fabric', 'Polyester'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Pocket', 'Contrast Binding', 'Drawstring', 'Embroidery', 'Exposed Seam'] },
            { name: 'Pattern Type', type: 'select', values: ['Polka Dot', 'Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve', 'Short Sleeve', 'Sleeveless', 'Half Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Stretch', 'Warming', 'Soft'] },
            { name: 'Sleeve Type', type: 'select', values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve', 'Batwing Sleeve', 'Flare Sleeve', 'Bishop Sleeve'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Zip-up Hoodies',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Composite Fabric', 'French Terry', 'Canvas'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Pocket', 'Contrast Binding', 'Drawstring', 'Contrast Faux Fur', 'Embroidery'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve', 'Short Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Soft'] },
            { name: 'Sleeve Type', type: 'select', values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve', 'Batwing Sleeve', 'Bishop Sleeve', 'Cold Shoulder'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Spring Festival'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Hoodies',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Composite Fabric', 'French Terry', 'Flocking', 'Polyester'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Wrist-Length Sleeve', 'Short Sleeve', 'Sleeveless', 'Three Quarter Length Sleeve', 'Half Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Stretch', 'Soft', 'Warming', 'Breathable'] },
            { name: 'Sleeve Type', type: 'select', values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve', 'Batwing Sleeve', 'Cold Shoulder', 'Puff Sleeve'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 4. Men Suits & Separates
    {
      name: 'Men Suits & Separates',
      children: [
        {
          name: 'Men Blazers',
          attributes: [
            { name: 'Style', type: 'select', values: ['Work', 'Casual'] },
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Composite Fabric', 'Flocking', 'Polyester', 'Sequins'] },
            { name: 'Length', type: 'select', values: ['Long', 'Midi', 'Crop', 'Knee Length'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Polka Dot', 'Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Short Sleeve', 'Half Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve', 'Extra-Long Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Lightweight', 'Skin-friendly', 'Anti Wrinkle'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Suits',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Skinny', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Composite Fabric', 'Viscose', 'Polyester', 'Sequins'] },
            { name: 'Length', type: 'select', values: ['Long', 'Crop', 'Bermuda shorts', 'Cropped'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Polka Dot', 'Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Sleeveless', 'Short Sleeve', 'Half Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Great quality', 'Comfortable', 'Soft', 'Fire Retardant Fabric', 'Anti Wrinkle', 'Cooling'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Drop Shoulder'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Suit Pants',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Regular Fit', 'Skinny', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Polyester', 'Sequins'] },
            { name: 'Length', type: 'select', values: ['Long', 'Extra Long', 'Bermuda shorts', 'Cropped'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Drawstring', 'Double Button', 'Exposed Seam'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Anti Wrinkle', 'Soft', 'Stretch', 'Cooling'] },
            { name: 'Occasion', type: 'multiselect', values: ['Daily', 'Weekend Casual', 'Going Out', 'Holiday', 'Night Out', 'Formal & Evening'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Spring Festival', 'Valentine\'s Day', 'Father\'s Day', 'Teachers\' Day'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 5. Men Knitwear
    {
      name: 'Men Knitwear',
      children: [
        {
          name: 'Men Sweaters',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            { name: 'Type', type: 'select', values: ['Pullovers', 'Basic Tops'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Polyester'] },
            { name: 'Length', type: 'select', values: ['Long', 'Crop', 'Micro Crop'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Scallop', 'Contrast Binding', 'Pearls'] },
            { name: 'Pattern Type', type: 'select', values: ['Chevron', 'Scarf Print', 'Baroque', 'Polka Dot', 'Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Wrist-Length Sleeve', 'Short Sleeve', 'Three Quarter Length Sleeve', 'Sleeveless', 'Half Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Stretch', 'Great quality', 'Soft & Lightweight', 'Soft', 'Maximum Comfort'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Knit Tops',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Scallop', 'Contrast Binding', 'Pearls'] },
            { name: 'Pattern Type', type: 'select', values: ['Chevron', 'Baroque', 'Polka Dot', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve', 'Long Sleeve', 'Half Sleeve', 'Sleeveless', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Lightweight', 'Great quality', 'Soft', 'Maximum Comfort', 'Soft & Lightweight'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Drop Shoulder', 'Batwing Sleeve', 'Raglan Sleeve', 'Cold Shoulder', 'Flare Sleeve'] },
            { name: 'Occasion', type: 'multiselect', values: ['Weekend Casual', 'Going Out', 'Street', 'Beach', 'Night Out', 'Sports'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 6. Men Outerwear
    {
      name: 'Men Outerwear',
      children: [
        {
          name: 'Men Winter Coats',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            { name: 'Type', type: 'select', values: ['Quilted', 'Vest'] },
            colorAttr, sizeAttr,
            { name: 'Length', type: 'select', values: ['Long', 'Knee Length'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Drawstring', 'Contrast Faux Fur', 'Double Button', 'Embroidery', 'Padded', 'Fuzzy', 'Ruched', 'Side Stripe', 'Bow', 'Ring', 'Rib-Knit', 'Belted', 'Patched', 'Button Front', 'Zipper', 'Rhinestone', 'Grommet Eyelet', 'Tape'] },
            { name: 'Pattern Type', type: 'select', values: ['Scarf Print', 'Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Sleeveless', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Warming', 'Soft'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Drop Shoulder', 'Raglan Sleeve', 'Batwing Sleeve'] },
            { name: 'Festivals', type: 'multiselect', values: ['Halloween', 'Christmas', 'Father\'s Day', 'International Workers\' Day', 'Mother\'s Day', 'Valentine\'s Day'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Shackets',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Polyester'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Pocket', 'Contrast Binding', 'Drawstring', 'Contrast Faux Fur', 'Embroidery', 'High Low', 'Raw Hem', 'Side Stripe', 'Rib-Knit', 'Sheer', 'Fringe', 'Patched', 'Button Front', 'Zipper', 'Rhinestone', 'Tape'] },
            { name: 'Pattern Type', type: 'select', values: ['Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Long Sleeve', 'Wrist-Length Sleeve', 'Short Sleeve', 'Half Sleeve', 'Three Quarter Length Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Anti Wrinkle', 'Stretch', 'Warming', 'Breathable'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Drop Shoulder', 'Shirt Sleeve'] },
            { name: 'Festivals', type: 'multiselect', values: ['Christmas', 'Halloween', 'New Year'] },
            { name: 'Ideal For', type: 'select', values: ['Conventional', 'Family Man', 'Unisex'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 7. Men Traditional & Cultural Wear
    {
      name: 'Men Traditional & Cultural Wear',
      children: [
        {
          name: 'Men Asian Wear',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Skinny', 'Loose'] },
            colorAttr, sizeAttr,
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Drawstring', 'Embroidery'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Geometric'] },
            { name: 'Sleeve Length', type: 'select', values: ['Three Quarter Length Sleeve', 'Half Sleeve', 'Long Sleeve', 'Sleeveless', 'Short Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Lightweight', 'Softness'] },
            { name: 'Sleeve Type', type: 'select', values: ['Drop Shoulder', 'Batwing Sleeve', 'Kimono Sleeve', 'Regular Sleeve'] },
            { name: 'Scenes', type: 'multiselect', values: ['Office', 'Holiday'] },
            { name: 'Fabric Elasticity', type: 'select', values: ['Slight Stretch', 'Non-Stretch'] },
            { name: 'Composition', type: 'select', values: ['Polyester', 'Cotton', 'Elastane'] },
            priceRangeAttr
          ]
        }
      ]
    },
    // 8. Men Tops
    {
      name: 'Men Tops',
      children: [
        {
          name: 'Men Shirts',
          attributes: [
            { name: 'Style', type: 'select', values: ['Casual', 'Elegant', 'Boho'] },
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Lace', 'Knitwear', 'Composite Fabric', 'Viscose', 'Organza', 'Canvas'] },
            { name: 'Length', type: 'select', values: ['Long', 'Crop'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Tie Front', 'Pearls'] },
            { name: 'Pattern Type', type: 'select', values: ['Chevron', 'Scarf Print', 'Baroque', 'Polka Dot', 'Tie Dye', 'Music & Instruments'] },
            { name: 'Neckline', type: 'select', values: ['Deep V Neck', 'Square Neck', 'Mandarin Collar'] },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve', 'Long Sleeve', 'Half Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve', 'Sleeveless'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Lightweight', 'Soft', 'Soft & Lightweight', 'Skin-friendly'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men T-Shirts',
          attributes: [
            { name: 'Style', type: 'select', values: ['Street', 'Casual'] },
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Lace', 'Knitwear', 'Composite Fabric', 'Flocking', 'Polyester', 'Sequins'] },
            { name: 'Length', type: 'select', values: ['Long', 'Crop', 'Micro Crop'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Scallop', 'Contrast Binding', 'Pearls'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Polka Dot', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Neckline', type: 'select', values: ['Deep V Neck', 'Square Neck'] },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve', 'Long Sleeve', 'Half Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve', 'Sleeveless'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Great quality', 'Soft', 'Lightweight', 'Maximum Comfort', 'Skin-friendly'] },
            { name: 'Sleeve Type', type: 'select', values: ['Drop Shoulder', 'Regular Sleeve', 'Raglan Sleeve', 'Batwing Sleeve', 'Roll Up Sleeve', 'Cold Shoulder'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Polo Shirts',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Knitwear', 'Polyester'] },
            { name: 'Length', type: 'select', values: ['Long', 'Crop', 'Micro Crop'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Scallop', 'Contrast Binding', 'Pearls'] },
            { name: 'Pattern Type', type: 'select', values: ['Chevron', 'Scarf Print', 'Baroque', 'Polka Dot', 'Tie Dye', 'Music & Instruments'] },
            { name: 'Neckline', type: 'select', values: ['Deep V Neck', 'Square Neck'] },
            { name: 'Sleeve Length', type: 'select', values: ['Short Sleeve', 'Long Sleeve', 'Half Sleeve', 'Wrist-Length Sleeve', 'Three Quarter Length Sleeve', 'Sleeveless'] },
            { name: 'Features', type: 'multiselect', values: ['Comfortable', 'Soft', 'Lightweight', 'Great quality', 'Soft & Lightweight', 'Skin-friendly'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Drop Shoulder', 'Raglan Sleeve', 'Batwing Sleeve', 'Roll Up Sleeve', 'Puff Sleeve'] },
            priceRangeAttr
          ]
        },
        {
          name: 'Men Tank Tops',
          attributes: [
            { name: 'Fit Type', type: 'select', values: ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit'] },
            colorAttr, sizeAttr,
            { name: 'Material', type: 'select', values: ['Lace', 'Knitwear', 'French Terry', 'Organza', 'Flocking', 'Polyester'] },
            { name: 'Length', type: 'select', values: ['Long', 'Crop'] },
            { name: 'Details', type: 'multiselect', values: ['Button', 'Knot', 'Pocket', 'Contrast Binding', 'Pearls', 'Drawstring'] },
            { name: 'Pattern Type', type: 'select', values: ['Baroque', 'Tie Dye', 'Music & Instruments', 'Geometric'] },
            { name: 'Neckline', type: 'select', values: ['Deep V Neck', 'Square Neck'] },
            { name: 'Sleeve Length', type: 'select', values: ['Sleeveless', 'Cap Sleeve'] },
            { name: 'Features', type: 'multiselect', values: ['Stretch', 'Anti Wrinkle', 'Breathable', 'Cooling', 'Absorbs Sweat', 'Quick-Drying'] },
            { name: 'Sleeve Type', type: 'select', values: ['Regular Sleeve', 'Batwing Sleeve'] },
            priceRangeAttr
          ]
        }
      ]
    }
  ]
};

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  try {
    console.log('Clearing old categories to avoid slug collisions...');
    await CategoryFilterModel.deleteMany({});
    await AttributeModel.deleteMany({});
    await CategoryModel.deleteMany({}); 
    console.log('Cleared existing categories, attributes, and filters.');
    
    console.log('Seeding new Men tree with all 8 parent categories...');
    await seedTree(NEW_MEN_TREE);
    console.log('Successfully seeded all categories, attributes, and filters.');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
