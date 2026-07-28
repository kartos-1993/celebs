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
    // 1. Find or create "Denim Jackets" subcategory
    let denimJacketCat = await CategoryModel.findOne({
      $or: [
        { name: /denim jacket/i },
        { slug: 'denim-jackets' }
      ]
    });

    if (!denimJacketCat) {
      console.log('Creating Denim Jackets category...');
      let parentCat = await CategoryModel.findOne({ level: 1, name: /men/i }) || await CategoryModel.findOne({ level: 1 });

      denimJacketCat = await CategoryModel.create({
        name: 'Denim Jackets',
        slug: 'denim-jackets',
        level: parentCat ? 2 : 1,
        parentCategory: parentCat ? parentCat._id : null,
        path: parentCat ? [...parentCat.path, 'denim-jackets'] : ['denim-jackets'],
        isActive: true,
        sizeChartColumns: ['Shoulder', 'Chest', 'Length', 'Sleeve Length']
      });
      console.log(`Created Denim Jackets category: ${denimJacketCat._id}`);
    } else {
      console.log(`Using category: ${denimJacketCat.name} (${denimJacketCat._id})`);
    }

    const parentCategoryId = denimJacketCat.parentCategory || denimJacketCat._id;
    const subcategoryId = denimJacketCat._id;

    // 2. Read json dataset
    const jsonPath = path.join(__dirname, 'data', 'denim_jackets.json');
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const items = JSON.parse(rawData);

    console.log(`Found ${items.length} items to seed.`);

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

      const productDoc = {
        name: item.title,
        slug: item.slug || `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-${i}`,
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

    console.log(`✅ Successfully seeded Denim Jackets products!`);
    console.log(`Inserted: ${insertedCount}, Updated: ${updatedCount}`);

  } catch (error) {
    console.error('Error seeding denim jackets products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

run();
