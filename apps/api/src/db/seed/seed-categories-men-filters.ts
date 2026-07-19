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
  imageUrl?: string;
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

async function ensureCategory(parent: any | null, name: string, sizeChartColumns?: string[], imageUrl?: string) {
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
      imageUrl: imageUrl || null,
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
    const cat = await ensureCategory(parent, node.name, node.sizeChartColumns, node.imageUrl);
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
      imageUrl: 'https://img.ltwebstatic.com/images3_pi/2022/12/13/16709088609e5e4ea6645646042c2f005b3be6ce61_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Denim Jackets',
          imageUrl: 'https://img.ltwebstatic.com/images3_pi/2024/07/15/22/17210064545039901e6e3dfcbd0015edca0258d1f3_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/images3_pi/2023/03/14/16787862981f223808599b08d085074c3c26d9f9e2_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2025/11/28/27/1764311186bbbae4d541cf7b788b91397d2cd0b128_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/04/10/85/17758108576ca5f1047faeab3e2943a90e0925266b_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Shorts',
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/05/12/45/17785670947af5f2615117fab2eceb1ca131c8d4f0_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2025/10/13/a1/176033211447c771514bf5c29ccc2ea9d8f0ec3447_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/04/20/ca/1776662630f7a5b534e2b7e89ebafdef1f671ade3a_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2026/04/01/eb/1775008530cdb7c6f8175613efb4cbc1b6560e8629_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Sweatshirts',
          imageUrl: 'https://img.ltwebstatic.com/v4/j/ssms/2025/11/21/f1/1763718468c1d4720b4669b80c197d3ba770875e0a_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/images3_pi/2024/08/28/d0/17248130253021436450bfa8dcc18d13c6efdc01f2_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2025/11/11/48/17628282858d6432a2484a214557ae57029bbeb309_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2026/05/28/1c/17799445898d1e873aee96086ffc4bd6d36d04e8df_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Blazers',
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/05/11/96/1778500187896dc421eb5ed65fbd228c007ac0474e_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/images3_pi/2024/10/24/c8/17297348147558d025fb1e8d313204fb1066ebe91e_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2026/01/18/52/1768725280d3e8b02d9cd78f0e5a6f905b52389047_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/06/08/58/17808933872729dde98d956d17dbdbf30a03020cae_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Sweaters',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/images3_pi/2025/02/14/65/17394974590425c2dd4fb1d55441e6992bd715c3fc_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2025/11/19/ac/1763519504614cef3ce1085809d129b340ed34e6ca_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Winter Coats',
          imageUrl: 'https://img.ltwebstatic.com/images3_pi/2024/08/21/8f/1724218507ea342dc563f8e9ed012910f1a19d2132_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/03/10/e4/177311161855a74e830027bd4fb7b36589aa791f3b_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2026/04/15/69/1776212811c32ad4720c0cb6b8ae1144991380f978_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Asian Wear',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
      imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2025/10/15/35/1760494300a33f033ebd1c17204489d7e29790206e_thumbnail_192x.avif',
      children: [
        {
          name: 'Men Shirts',
          imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2025/07/12/e7/17523233863dc8cde4cd5bdc679f14a5eb4ea11d2b_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/spmp/2026/05/29/73/178004085470f4943ef018f70702b75997f5a4e910_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2026/05/27/f7/177984840592eac6f650e064ac468f8f58f1d4ae82_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
          imageUrl: 'https://img.ltwebstatic.com/v4/j/pi/2025/10/31/b9/176187507473ce27b9b2823bfbfa710671923f0077_thumbnail_192x.avif',
          sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
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
