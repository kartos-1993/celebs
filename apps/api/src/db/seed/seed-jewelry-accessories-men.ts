import mongoose, { Types } from 'mongoose';
import slugify from 'slugify';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development'),
});

import { CategoryModel } from '@/db/models/category.model';
import { AttributeModel } from '@/db/models/attribute.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/celebs';

type AllowedGroup = 'basic' | 'sale' | 'package' | 'details' | 'termcondition' | 'variant';

interface SeedAttr {
  name: string;
  label?: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values?: string[];
  isRequired?: boolean;
  isVariant?: boolean;
  group?: AllowedGroup;
  placeholder?: string;
}

interface SeedCategory {
  name: string;
  imageUrl?: string;
  attributes?: SeedAttr[];
  children?: SeedCategory[];
}

function mkAttr(a: SeedAttr) {
  const group: AllowedGroup = a.group
    ? a.group
    : a.isVariant
    ? 'variant'
    : 'details';
  return {
    name: a.name,
    label: a.label || a.name,
    type: a.type,
    values: a.values ?? [],
    isRequired: a.isRequired ?? false,
    isVariant: !!a.isVariant,
    placeholder: a.placeholder || '',
    group,
  };
}

const JEWELRY_ACCESSORIES_TREE: SeedCategory = {
  name: 'Jewelry & Accessories',
  imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  children: [
    {
      name: 'Watches & Timepieces',
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      children: [
        {
          name: "Men's Mechanical Watches",
          imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
          attributes: [
            {
              name: 'Movement Type',
              type: 'select',
              values: ['Automatic Self-Winding', 'Manual Hand-Wind', 'Skeleton Mechanical', 'Tourbillon'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Case Diameter',
              type: 'select',
              values: ['38mm', '40mm', '42mm', '44mm', '46mm'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Water Resistance Rating',
              type: 'select',
              values: ['30m (3 ATM)', '50m (5 ATM)', '100m (10 ATM)', '200m (Diver 20 ATM)'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Glass Crystal Material',
              type: 'select',
              values: ['Sapphire Crystal', 'Hardlex Mineral Glass', 'Hesalite Acrylic'],
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Case Material',
              type: 'select',
              values: ['316L Stainless Steel', 'Titanium', 'Rose Gold PVD', 'Ceramic', 'Carbon Fiber'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Power Reserve',
              type: 'select',
              values: ['36 Hours', '42 Hours', '70 Hours', '80 Hours'],
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Strap Material',
              type: 'multiselect',
              values: ['316L Steel Bracelet', 'Italian Genuine Leather', 'NATO Nylon Strap', 'Fluororubber Strap', 'Mesh Bracelet'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Dial Color',
              type: 'multiselect',
              values: ['Midnight Blue', 'Obsidian Black', 'Sunburst Silver', 'Emerald Green', 'Champagne Gold'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Warranty Period',
              type: 'select',
              values: ['1 Year International Warranty', '2 Years International Warranty', '5 Years Manufacturer Warranty'],
              isRequired: false,
              group: 'termcondition',
            },
          ],
        },
      ],
    },
    {
      name: 'Fine & Fashion Jewelry',
      imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      children: [
        {
          name: "Men's Rings",
          imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
          attributes: [
            {
              name: 'Base Metal',
              type: 'select',
              values: ['925 Sterling Silver', '14K Gold', '18K Yellow Gold', 'Tungsten Carbide', 'Titanium', '316L Stainless Steel'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Main Gemstone',
              type: 'select',
              values: ['Lab-Grown Diamond', 'Cubic Zirconia', 'Onyx', 'Sapphire', 'Moissanite', 'None'],
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Gemstone Carat',
              type: 'select',
              values: ['0.5 ct', '1.0 ct', '1.5 ct', '2.0 ct', 'None'],
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Band Width',
              type: 'select',
              values: ['4mm', '6mm', '8mm', '10mm'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Surface Plating',
              type: 'select',
              values: ['Rhodium Plated', '18K Gold Plated', 'Black IP Plated', 'Brushed Matte Finish'],
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Hypoallergenic',
              type: 'boolean',
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Ring Size (US)',
              type: 'multiselect',
              values: ['US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12', 'US 13'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Metal Finish Color',
              type: 'multiselect',
              values: ['Sterling Silver', 'Yellow Gold', 'Rose Gold', 'Matte Black', 'Two-Tone Silver/Gold'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
          ],
        },
      ],
    },
    {
      name: 'Small Leather Goods',
      imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
      children: [
        {
          name: "Men's Wallets",
          imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
          attributes: [
            {
              name: 'Main Material',
              type: 'select',
              values: ['Genuine Full-Grain Cowhide', 'Top-Grain Nappa Leather', 'PU Vegan Leather', 'Carbon Fiber Composite', 'Waxed Canvas'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Wallet Style',
              type: 'select',
              values: ['Bifold Wallet', 'Trifold Wallet', 'Slim Cardholder', 'Money Clip Wallet', 'Zip-Around Travel Wallet'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'RFID Blocking Protection',
              type: 'boolean',
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Card Slot Capacity',
              type: 'select',
              values: ['4 Card Slots', '6 Card Slots', '8 Card Slots', '12+ Card Slots'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Coin Compartment',
              type: 'boolean',
              isRequired: false,
              group: 'details',
            },
            {
              name: 'Wallet Color',
              type: 'multiselect',
              values: ['Vintage Tan', 'Onyx Black', 'Dark Chestnut Brown', 'Navy Blue', 'Carbon Black'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Leather Texture',
              type: 'multiselect',
              values: ['Smooth Nappa', 'Pebbled Grain', 'Carbon Fiber Weave', 'Distressed Vintage Leather'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
          ],
        },
      ],
    },
    {
      name: "Men's Neckwear & Accessories",
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      children: [
        {
          name: "Men's Neckties & Gift Sets",
          imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
          attributes: [
            {
              name: 'Fabric Composition',
              type: 'select',
              values: ['100% Mulberry Silk', 'Microfiber Jacquard', 'Wool Blend', 'Knitted Cotton'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Pattern Style',
              type: 'select',
              values: ['Classic Paisley', 'Solid Satin', 'Stripe Jacquard', 'Geometric Grid', 'Floral Brocade'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Tie Blade Width',
              type: 'select',
              values: ['Slim (6.0cm)', 'Modern Regular (7.5cm)', 'Traditional Wide (8.5cm)'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Tie Length',
              type: 'select',
              values: ['Standard Length (148cm)', 'Extra Long (160cm)'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Colorway & Pattern',
              type: 'multiselect',
              values: ['Royal Blue Paisley', 'Burgundy Solid', 'Emerald Floral', 'Charcoal Geometric', 'Navy Gold Striped'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Package Set Configuration',
              type: 'multiselect',
              values: ['Single Necktie Only', '2-Piece Tie & Pocket Square Set', '4-Piece Deluxe Gift Box (Tie + Pocket Square + Cufflinks + Lapel Pin)'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
          ],
        },
      ],
    },
    {
      name: "Men's Eyewear",
      imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
      children: [
        {
          name: "Men's Sunglasses",
          imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
          attributes: [
            {
              name: 'Frame Shape',
              type: 'select',
              values: ['Aviator', 'Wayfarer', 'Round Vintage', 'Square Executive', 'Clubmaster', 'Sport Wrap'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Lens Technology',
              type: 'select',
              values: ['UV400 Protection', 'TAC Polarized', 'Anti-Reflective Coating', 'Photochromic Transition', 'Mirrored'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Frame Material',
              type: 'select',
              values: ['TR90 Flexible Acetate', 'Titanium Alloy', '316L Stainless Steel', 'Eco Hardwood'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Lens Material',
              type: 'select',
              values: ['TAC Polarized Film', 'Polycarbonate Shatterproof', 'Mineral Optical Glass'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Frame & Lens Colorway',
              type: 'multiselect',
              values: ['Gold Frame / G15 Green Polarized', 'Matte Black / Dark Grey Polarized', 'Gunmetal / Blue Mirror', 'Tortoise Shell / Brown Gradient'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
          ],
        },
      ],
    },
  ],
};

async function seedCategoryRecursively(
  cat: SeedCategory,
  parentId: Types.ObjectId | null = null,
  level = 1,
  parentPath: string[] = [],
): Promise<void> {
  const slug = slugify(cat.name, { lower: true, strict: true });
  const currentPath = [...parentPath, cat.name];

  let doc = await CategoryModel.findOne({ slug });

  if (!doc) {
    doc = await CategoryModel.create({
      name: cat.name,
      slug,
      level,
      parentCategory: parentId,
      path: currentPath,
      imageUrl: cat.imageUrl || null,
      isActive: true,
    });
    console.log(`[Seed] Created category: "${cat.name}" (Level ${level})`);
  } else {
    doc.name = cat.name;
    doc.level = level;
    doc.parentCategory = parentId as any;
    doc.path = currentPath;
    if (cat.imageUrl) doc.imageUrl = cat.imageUrl;
    await doc.save();
    console.log(`[Seed] Updated existing category: "${cat.name}" (Level ${level})`);
  }

  // Seed category attributes if present
  if (cat.attributes && cat.attributes.length > 0) {
    for (const attrSeed of cat.attributes) {
      const payload = mkAttr(attrSeed);

      const existingAttr = await AttributeModel.findOne({
        categoryId: doc._id,
        name: payload.name,
      });

      if (existingAttr) {
        existingAttr.type = payload.type;
        existingAttr.values = payload.values;
        existingAttr.isRequired = payload.isRequired;
        existingAttr.isVariant = payload.isVariant;
        existingAttr.group = payload.group;
        existingAttr.label = payload.label;
        existingAttr.markModified('values');
        await existingAttr.save();
        console.log(`  └─ Updated attribute: "${payload.name}" for "${cat.name}"`);
      } else {
        await AttributeModel.create({
          categoryId: doc._id,
          ...payload,
        });
        console.log(`  └─ Created attribute: "${payload.name}" for "${cat.name}"`);
      }
    }
  }

  // Seed child categories
  if (cat.children && cat.children.length > 0) {
    for (const child of cat.children) {
      await seedCategoryRecursively(child, doc._id as Types.ObjectId, level + 1, currentPath);
    }
  }
}

export async function seedJewelryAndAccessories(): Promise<void> {
  console.log('\n💎 Starting Jewelry & Accessories Categories & Attributes Seeder...');

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
      console.log(`Connected to MongoDB at ${MONGODB_URI}`);
    }

    await seedCategoryRecursively(JEWELRY_ACCESSORIES_TREE);

    console.log('✅ Jewelry & Accessories Categories & Attributes Seeded Successfully!\n');
  } catch (error) {
    console.error('❌ Seeder failed with error:', error);
    throw error;
  }
}

// Allow direct CLI execution: ts-node src/db/seed/seed-jewelry-accessories-men.ts
if (require.main === module) {
  seedJewelryAndAccessories()
    .then(() => {
      mongoose.connection.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      mongoose.connection.close();
      process.exit(1);
    });
}
