import { Types } from 'mongoose';
import slugify from 'slugify';
import { CategoryModel } from '../models/category.model';
import { AttributeModel } from '../models/attribute.model';
import { connectDb, disconnectDb } from './config';
import type { AttributeGroup as AllowedGroup } from '@celebs/shared-types';

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
              values: ['Automatic Self-Winding', 'Manual Hand-Wind', 'Skeleton Mechanical', 'Tourbillon', 'Quartz'],
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
              name: 'Strap Material',
              type: 'multiselect',
              values: ['316L Steel Bracelet', 'Genuine Leather', 'NATO Nylon Strap', 'Rubber Strap', 'Mesh Bracelet'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Dial Color',
              type: 'multiselect',
              values: ['Midnight Blue', 'Obsidian Black', 'Sunburst Silver', 'Emerald Green', 'Champagne Gold', 'Brown'],
              isRequired: true,
              isVariant: true,
              group: 'variant',
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
              values: ['925 Sterling Silver', '14K Gold', '18K Yellow Gold', 'Tungsten Carbide', 'Titanium', '316L Stainless Steel', 'Brass'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Ring Size (US)',
              type: 'multiselect',
              values: ['US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12', 'US 13', 'Free Size'],
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

  const doc = await CategoryModel.findOneAndUpdate(
    { name: cat.name, parentCategory: parentId },
    {
      name: cat.name,
      slug,
      level,
      parentCategory: parentId,
      path: currentPath,
      imageUrl: cat.imageUrl || null,
      isActive: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  console.log(`  └─ Category: "${cat.name}" (Level ${level})`);

  if (cat.attributes && cat.attributes.length > 0) {
    for (const attrSeed of cat.attributes) {
      const payload = mkAttr(attrSeed);

      await AttributeModel.findOneAndUpdate(
        { categoryId: doc._id, name: payload.name },
        { categoryId: doc._id, ...payload },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  if (cat.children && cat.children.length > 0) {
    for (const child of cat.children) {
      await seedCategoryRecursively(child, doc._id as Types.ObjectId, level + 1, currentPath);
    }
  }
}

export async function seedCategoriesJewelry(): Promise<void> {
  console.log('\n💎 Seeding Jewelry & Accessories Categories & Attributes...');
  await connectDb();
  await seedCategoryRecursively(JEWELRY_ACCESSORIES_TREE);
  console.log('✅ Jewelry & Accessories Categories Seeded Successfully!');
}

if (require.main === module) {
  seedCategoriesJewelry()
    .then(() => disconnectDb())
    .catch((err) => {
      console.error('❌ Seeding jewelry categories failed:', err);
      disconnectDb();
      process.exit(1);
    });
}
