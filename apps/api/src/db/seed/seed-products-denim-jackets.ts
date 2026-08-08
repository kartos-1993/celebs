import fs from 'fs';
import path from 'path';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { connectDb, disconnectDb } from './config';

export async function seedProductsDenimJackets(): Promise<void> {
  console.log('\n🧥 Seeding Denim Jackets Products...');
  await connectDb();

  // 1. Find or create "Men Denim Jackets" subcategory
  let denimJacketCat = await CategoryModel.findOne({
    $or: [
      { name: /men denim jacket/i },
      { name: /denim jacket/i },
      { slug: 'men-denim-jackets' },
      { slug: 'denim-jackets' }
    ]
  });

  if (!denimJacketCat) {
    console.log('  └─ Category not found. Resolving or creating category...');
    let parentCat = await CategoryModel.findOne({ level: 1, name: /men/i }) || await CategoryModel.findOne({ level: 1 });

    denimJacketCat = await CategoryModel.create({
      name: 'Men Denim Jackets',
      slug: 'men-denim-jackets',
      level: parentCat ? 2 : 1,
      parentCategory: parentCat ? (parentCat.id || parentCat._id) : null,
      path: parentCat ? [...parentCat.path, 'men-denim-jackets'] : ['men-denim-jackets'],
      isActive: true,
      sizeChartColumns: ['Shoulder', 'Chest', 'Length', 'Sleeve Length']
    });
  }

  const parentCategoryId = denimJacketCat.parentCategory || denimJacketCat.id || denimJacketCat._id;
  const subcategoryId = denimJacketCat.id || denimJacketCat._id;

  // 2. Read json dataset
  const jsonPath = path.join(__dirname, 'data', 'denim_jackets.json');
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
      if (sc.shoulder !== undefined) prodMeasurements.push({ name: 'Shoulder', value: String(sc.shoulder), unit: 'cm' });
      if (sc.chest !== undefined) prodMeasurements.push({ name: 'Chest', value: String(sc.chest), unit: 'cm' });
      if (sc.length !== undefined) prodMeasurements.push({ name: 'Length', value: String(sc.length), unit: 'cm' });
      if (sc.sleeveLength !== undefined) prodMeasurements.push({ name: 'Sleeve Length', value: String(sc.sleeveLength), unit: 'cm' });

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
        quantity: 20
      }))
    }));

    const mainImages = item.variants?.[0]?.images?.length > 0
      ? item.variants[0].images
      : ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800'];

    const price = 2400 + ((i * 150) % 2000);
    const discountedPrice = Math.round(price * 0.85);
    const productSlug = item.slug ? `${item.slug}-${i}` : `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-${i}`;

    const productDoc = {
      name: item.title,
      slug: productSlug,
      brand: item.title.split(' ')[0] || 'Celebs',
      description: `Premium denim jacket. Fit: ${item.attributes?.fitType || 'Regular'}. Material: ${item.attributes?.composition || 'Denim'}.`,
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
      tags: ['Denim', 'Jacket', item.attributes?.fitType || 'Regular'].filter(Boolean),
      featured: true,
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

  console.log(`✅ Seeded Denim Jackets: ${insertedCount} inserted, ${updatedCount} updated.`);
}

if (require.main === module) {
  seedProductsDenimJackets()
    .then(() => disconnectDb())
    .catch((err) => {
      console.error('❌ Seeding denim jackets products failed:', err);
      disconnectDb();
      process.exit(1);
    });
}
