import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/celebs';

async function run() {
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  try {
    // 1. Find or create the "Denim Jeans" category
    let denimCategory = await CategoryModel.findOne({
      $or: [
        { name: /denim jeans/i },
        { slug: 'denim-jeans' },
        { name: /jeans/i }
      ]
    });

    if (!denimCategory) {
      console.log('Denim Jeans category not found. Creating category...');
      
      // Find parent category (e.g. Men / Clothing or Top level)
      let parentCat = await CategoryModel.findOne({ level: 1, name: /men/i });
      if (!parentCat) {
        parentCat = await CategoryModel.findOne({ level: 1 });
      }

      denimCategory = await CategoryModel.create({
        name: 'Denim Jeans',
        slug: 'denim-jeans',
        level: parentCat ? 2 : 1,
        parentCategory: parentCat ? parentCat._id : null,
        path: parentCat ? [...parentCat.path, 'Denim Jeans'] : ['Denim Jeans'],
        isActive: true,
        sizeChartColumns: ['Waist', 'Hip', 'Inseam', 'Thigh']
      });
      console.log(`Created Denim Jeans category with ID: ${denimCategory._id}`);
    } else {
      console.log(`Using existing Denim Jeans category: ${denimCategory.name} (${denimCategory._id})`);
    }

    // Determine parent category ID for products
    const parentCategoryId = denimCategory.parentCategory || denimCategory._id;
    const subcategoryId = denimCategory._id;
    // 2. Read denim_jeans.json data
    const jsonPath = path.join(__dirname, 'data', 'denim_jeans.json');
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const items = JSON.parse(rawData);

    console.log(`Found ${items.length} items to seed.`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Format size chart / sizes payload
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

      // Format variants
      const colorVariants = (item.variants || []).map((v: any) => {
        return {
          name: v.color || 'Default',
          colorCode: v.color === 'Black' ? '#000000' : v.color === 'Blue' ? '#0000FF' : '#888888',
          images: v.images || [],
          stocks: (item.measurements?.sizeChart || []).map((sc: any) => ({
            size: sc.size,
            quantity: 25
          }))
        };
      });

      // Main image array from first variant images
      const mainImages = item.variants?.[0]?.images?.length > 0
        ? item.variants[0].images.slice(0, 5)
        : ['https://images.unsplash.com/photo-1542272604-780c36856d67?q=80&w=800'];

      const price = 1500 + ((i * 120) % 1500);
      const discountedPrice = Math.round(price * 0.85);

      const productDoc = {
        name: item.title,
        slug: item.slug ? `${item.slug}-${i}` : `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-${i}`,
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
        isActive: true
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

    console.log(`✅ Successfully seeded Denim Jeans products!`);
    console.log(`Inserted: ${insertedCount}, Updated: ${updatedCount}`);

  } catch (error) {
    console.error('Error seeding denim jeans products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

run();
