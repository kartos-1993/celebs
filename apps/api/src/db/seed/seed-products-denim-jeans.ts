import fs from 'fs';
import path from 'path';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { connectDb, disconnectDb } from './config';

export async function seedProductsDenimJeans(): Promise<void> {
  console.log('\n👖 Seeding Denim Jeans Products...');
  await connectDb();

  // 1. Find or create "Men Jeans" category
  let denimCategory = await CategoryModel.findOne({
    $or: [
      { name: /men jeans/i },
      { name: /denim jeans/i },
      { slug: 'men-jeans' },
      { slug: 'denim-jeans' }
    ]
  });

  if (!denimCategory) {
    console.log('  └─ Category not found. Resolving or creating category...');
    let parentCat = await CategoryModel.findOne({ level: 1, name: /men/i }) || await CategoryModel.findOne({ level: 1 });

    denimCategory = await CategoryModel.create({
      name: 'Men Jeans',
      slug: 'men-jeans',
      level: parentCat ? 2 : 1,
      parentCategory: parentCat ? parentCat.id : null,
      path: parentCat ? [...parentCat.path, 'men-jeans'] : ['men-jeans'],
      isActive: true,
      sizeChartColumns: ['Waist', 'Hip', 'Inseam', 'Thigh']
    });
  }

  const parentCategoryId = denimCategory.parentCategory || denimCategory.id;
  const subcategoryId = denimCategory.id;

  // 2. Read denim_jeans.json data
  const jsonPath = path.join(__dirname, 'data', 'denim_jeans.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn(`  └─ Dataset not found at: ${jsonPath}. Skipping.`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const items = JSON.parse(rawData);

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const sizesPayload = (item.measurements?.sizeChart || []).map((sc: any) => {
      const prodMeasurements = [];
      if (sc.waist !== undefined) prodMeasurements.push({ name: 'Waist', value: String(sc.waist), unit: 'cm' });
      if (sc.hip !== undefined) prodMeasurements.push({ name: 'Hip', value: String(sc.hip), unit: 'cm' });
      if (sc.inseam !== undefined) prodMeasurements.push({ name: 'Inseam', value: String(sc.inseam), unit: 'cm' });
      if (sc.thigh !== undefined) prodMeasurements.push({ name: 'Thigh', value: String(sc.thigh), unit: 'cm' });

      return {
        name: sc.size,
        productMeasurements: prodMeasurements,
        bodyMeasurements: prodMeasurements
      };
    });

    const colorVariants = (item.variants || []).map((v: any) => ({
      name: v.color || 'Default',
      colorCode: v.color === 'Black' ? '#000000' : v.color === 'Blue' ? '#0000FF' : '#888888',
      images: v.images || [],
      stocks: (item.measurements?.sizeChart || []).map((sc: any) => ({
        size: sc.size,
        quantity: 25
      }))
    }));

    const mainImages = item.variants?.[0]?.images?.length > 0
      ? item.variants[0].images.slice(0, 5)
      : ['https://images.unsplash.com/photo-1542272604-780c36856d67?q=80&w=800'];

    const price = 1500 + ((i * 120) % 1500);
    const discountedPrice = Math.round(price * 0.85);
    const productSlug = item.slug ? `${item.slug}-${i}` : `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-${i}`;

    const productDoc = {
      name: item.title,
      slug: productSlug,
      brand: item.title.split(' ')[0] || 'Celebs',
      description: `High quality denim jeans. Details: ${(item.attributes?.details || []).join(', ')}. Fit: ${item.attributes?.fitType || 'Regular'}. Material: ${item.attributes?.composition || 'Denim'}.`,
      price,
      discountedPrice,
      category: parentCategoryId,
      subcategory: subcategoryId,
      sizes: sizesPayload,
      colorVariants,
      mainImages,
      dynamicData: {
        values: {
          mainImage: mainImages,
          ...(item.attributes || {})
        }
      },
      tags: ['Denim', 'Jeans', item.attributes?.fitType || 'Regular'].filter(Boolean),
      featured: i < 5,
      status: 'published' as const,
      createdBy: 'system-seed',
      updatedBy: 'system-seed'
    };

    const result = await ProductModel.updateOne(
      { slug: productDoc.slug },
      { $set: productDoc },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      insertedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`✅ Seeded Denim Jeans: ${insertedCount} inserted, ${updatedCount} updated.`);
}

if (require.main === module) {
  seedProductsDenimJeans()
    .then(() => disconnectDb())
    .catch((err) => {
      console.error('❌ Seeding denim jeans products failed:', err);
      disconnectDb();
      process.exit(1);
    });
}
