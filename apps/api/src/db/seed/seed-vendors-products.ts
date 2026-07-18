import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development'),
});

import { CategoryModel } from '@/db/models/category.model';
import { ProductModel } from '@/db/models/product.model';
import { MediaModel } from '@/db/models/media.model';
import { OptionSetModel } from '@/db/models/option-set.model';
import prisma from '@/db';
import { hashValue } from '@/common/utils/bcrypt';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce';

const VENDORS = [
  { email: 'vendor01@celebs.com', shopName: 'Manfinity Nepal', name: 'Ram Sharma' },
  { email: 'vendor02@celebs.com', shopName: 'UrbanStitch Co.', name: 'Sita Thapa' },
  { email: 'vendor03@celebs.com', shopName: 'HimalStyle Traders', name: 'Hari Gurung' },
  { email: 'vendor04@celebs.com', shopName: 'KTM Denim House', name: 'Gita Maharjan' },
  { email: 'vendor05@celebs.com', shopName: 'Everest Threads', name: 'Krishna Tamang' },
  { email: 'vendor06@celebs.com', shopName: 'Patan Fashion Hub', name: 'Laxmi Shrestha' },
  { email: 'vendor07@celebs.com', shopName: 'NepWear Studio', name: 'Bishnu Rai' },
  { email: 'vendor08@celebs.com', shopName: 'Thamel Trend Co.', name: 'Sarita Bhandari' },
  { email: 'vendor09@celebs.com', shopName: 'Boudha Garments', name: 'Ramesh Karki' },
  { email: 'vendor10@celebs.com', shopName: 'Lakeside Apparels', name: 'Anita Magar' },
  { email: 'vendor11@celebs.com', shopName: 'Bhaktapur Stitch', name: 'Santosh Joshi' },
  { email: 'vendor12@celebs.com', shopName: 'Pokhara Threads', name: 'Puja Limbu' },
  { email: 'vendor13@celebs.com', shopName: 'Lumbini Fashion', name: 'Dipak Adhikari' },
  { email: 'vendor14@celebs.com', shopName: 'Chitwan Styles', name: 'Maya Khadka' },
  { email: 'vendor15@celebs.com', shopName: 'Janakpur Garments', name: 'Suresh Pandey' },
  { email: 'vendor16@celebs.com', shopName: 'Durbar Menswear', name: 'Bindu Ghimire' },
  { email: 'vendor17@celebs.com', shopName: 'Sagarmatha Outfitters', name: 'Roshan Dahal' },
  { email: 'vendor18@celebs.com', shopName: 'Annapurna Basics', name: 'Kamala Basnet' },
  { email: 'vendor19@celebs.com', shopName: 'Nagarkot Drip', name: 'Nabin Chhetri' },
  { email: 'vendor20@celebs.com', shopName: 'Biratnagar Textiles', name: 'Sabina Rijal' },
];

const MOCK_PASSWORD = 'Vendor@123';

const DYNAMIC_ATTRIBUTES: Record<string, string[]> = {
  'Fit Type': ['Oversized', 'Regular Fit', 'Loose', 'Slim Fit', 'Skinny'],
  'Material': ['Cotton', 'Polyester', 'Viscose', 'Denim', 'Knitwear', 'Blend'],
  'Pattern Type': ['Plain', 'Striped', 'Graphic', 'Colorblock', 'Plaid', 'All Over Print'],
  'Sleeve Length': ['Short Sleeve', 'Long Sleeve', 'Sleeveless', 'Half Sleeve'],
  'Style': ['Casual', 'Street', 'Sporty', 'Minimalist', 'Formal'],
  'Neckline': ['Crew Neck', 'V Neck', 'Polo Collar', 'Henley'],
  'Length': ['Regular', 'Cropped', 'Longline', 'Knee Length', 'Midi'],
  'Wash': ['Light', 'Medium', 'Dark', 'Black', 'Acid Wash']
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getLocalSeedImageUrl(): string {
  const randomId = Math.floor(Math.random() * 20) + 1;
  return `http://localhost:3333/seed-images/mens-fashion-${randomId}.jpg`;
}

async function run() {
  console.log('--- Starting Vendor & Product Seed ---');
  
  // Connect Mongo
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Phase 1: Prisma Vendors
  console.log('\n--- Phase 1: Seeding Vendors in PostgreSQL ---');
  const hashedPassword = await hashValue(MOCK_PASSWORD);
  
  const vendorProfiles = [];

  for (let i = 0; i < VENDORS.length; i++) {
    const v = VENDORS[i];
    
    // Clean old if exists
    await prisma.user.deleteMany({ where: { email: v.email }});
    
    const user = await prisma.user.create({
      data: {
        name: v.name,
        email: v.email,
        password: hashedPassword,
        role: 'VENDOR',
        isEmailVerified: true,
        vendorProfile: {
          create: {
            phoneNumber: `9800000${String(i).padStart(3, '0')}`,
            shopName: v.shopName,
            shopDescription: `Official store for ${v.shopName}`,
            panNumber: `PAN-${String(i+1).padStart(5, '0')}`,
            citizenshipNumber: `CIT-${String(i+1).padStart(5, '0')}`,
            status: 'APPROVED',
            onboardingStep: 5
          }
        }
      },
      include: { vendorProfile: true }
    });
    
    vendorProfiles.push(user.vendorProfile);
    console.log(`Created vendor: ${v.shopName} (${v.email})`);
  }

  // Phase 2: MongoDB Products
  console.log('\n--- Phase 2: Seeding Products in MongoDB ---');
  console.log('Clearing old products and media...');
  await ProductModel.deleteMany({});
  await MediaModel.deleteMany({});
  
  // Get Color options
  const colorOptionSet = await OptionSetModel.findOne({ name: 'Basic Colors' });
  if (!colorOptionSet || !colorOptionSet.values || colorOptionSet.values.length === 0) {
    throw new Error('Basic Colors OptionSet not found. Please run seed-categories-men-filters.ts first.');
  }
  const ALL_COLORS = colorOptionSet.values;

  // Fetch leaf categories (Level 3 or deepest)
  // Men tree is Level 1 (Men) -> Level 2 (e.g. Men Denim) -> Level 3 (e.g. Men Jeans)
  const allMenCategories = await CategoryModel.find({ path: 'men' });
  let finalCategories = allMenCategories.filter(c => c.level >= 3);
  
  if (finalCategories.length === 0) {
    // fallback if hierarchy is different
    finalCategories = await CategoryModel.find({ level: 3 });
  }
  
  if (finalCategories.length === 0) {
    throw new Error('No leaf categories found for seeding. Run categories seed first.');
  }
  
  console.log(`Found ${finalCategories.length} leaf categories.`);

  let totalProductsSeeded = 0;
  
  for (let i = 0; i < vendorProfiles.length; i++) {
    const vendor = vendorProfiles[i]!;
    const vendorId = vendor.id;
    const vendorName = vendor.shopName;
    
    // Pick ~12 random categories for this vendor
    const vendorCats = getRandomElements(finalCategories, Math.min(12, finalCategories.length));
    
    const productsToInsert = [];
    
    console.log(`\nGenerating 150 products for vendor: ${vendorName}...`);
    
    for (let p = 0; p < 150; p++) {
      const category = vendorCats[p % vendorCats.length];
      const parentCat = await CategoryModel.findById(category.parentCategory);
      
      const isTop = ['shirts', 't-shirts', 'hoodies', 'jackets', 'coats', 'sweaters', 'tops', 'blazers'].some(t => category.slug.includes(t));
      const sizesList = isTop ? ['S', 'M', 'L'] : ['30', '32', '34'];
      
      const productColors = getRandomElements(ALL_COLORS, 3);
      const colorVariants = [];
      const colorMeta: any = {};
      const skuVariants: any = {};
      
      const price = Math.floor(Math.random() * (5000 - 800 + 1)) + 800;
      const discountedPrice = Math.random() > 0.4 ? Math.floor(price * 0.8) : undefined;
      
      for (const color of productColors) {
        const cImages = [getLocalSeedImageUrl(), getLocalSeedImageUrl(), getLocalSeedImageUrl()];
        
        colorVariants.push({
          name: color,
          colorCode: color, // Fallback if no hex
          images: cImages,
          stocks: sizesList.map(s => ({ size: s, quantity: Math.floor(Math.random() * 40) + 10 }))
        });
        
        colorMeta[color] = { swatch: cImages[0], images: cImages, hot: Math.random() > 0.7 };
        
        const sizeMap: any = {};
        sizesList.forEach(s => {
          sizeMap[s] = {
            price: String(price),
            specialPrice: discountedPrice ? String(discountedPrice) : "",
            stock: String(Math.floor(Math.random() * 40) + 10),
            sellerSku: `SKU-${vendor.id.substring(0,6)}-${color.substring(0,3)}-${s}-${Math.floor(Math.random()*1000)}`,
            available: true
          };
        });
        skuVariants[color] = { Size: sizeMap };
      }
      
      const sizesPayload = sizesList.map((size, sIdx) => {
        let cols = isTop ? ['Shoulder', 'Bust', 'Length', 'Sleeve Length'] : ['Waist Size', 'Hip Size', 'Length', 'Thigh'];
        const measurements = (colName: string) => ({
          name: colName,
          value: String(40 + sIdx * 3 + Math.floor(Math.random() * 5)),
          unit: 'cm'
        });
        return {
          name: size,
          productMeasurements: cols.map(c => measurements(c)),
          bodyMeasurements: cols.map(c => measurements(c))
        };
      });
      
      const mainImages = colorVariants[0].images;
      
      const dynValues: any = {
        mainImage: mainImages,
        Color: productColors,
        Size: sizesList,
        variants: { colorMeta },
        sku: { variants: { Color: skuVariants } }
      };
      
      Object.keys(DYNAMIC_ATTRIBUTES).forEach(attr => {
        dynValues[attr] = getRandomElement(DYNAMIC_ATTRIBUTES[attr]);
      });
      
      const productName = `${vendorName} ${dynValues['Fit Type']} ${dynValues['Style']} ${category.name}`;
      
      productsToInsert.push({
        name: productName,
        brand: vendorName,
        slug: `${slugify(productName, { lower: true, strict: true })}-${uuidv4().substring(0,8)}`,
        description: `Premium mock listing for ${productName}. Crafted from high quality materials. Perfect for full stack catalog testing. Features ${dynValues['Fit Type']} fit and ${dynValues['Pattern Type']} pattern.`,
        price,
        discountedPrice,
        category: parentCat ? parentCat._id : category.parentCategory,
        subcategory: category._id,
        sizes: sizesPayload,
        colorVariants,
        mainImages,
        dynamicData: dynValues,
        tags: ['New', 'Trending', vendorName.toLowerCase(), 'Men', 'Boys'],
        featured: Math.random() > 0.9,
        status: 'published',
        vendorId,
        vendorName,
        createdBy: 'system-seed',
        updatedBy: 'system-seed'
      });
    }
    
    // Insert 150 products in batches of 50
    const chunkSize = 50;
    for (let j = 0; j < productsToInsert.length; j += chunkSize) {
      const chunk = productsToInsert.slice(j, j + chunkSize);
      await ProductModel.insertMany(chunk);
    }
    
    totalProductsSeeded += productsToInsert.length;
    console.log(`  -> Inserted ${productsToInsert.length} products (Total: ${totalProductsSeeded}/3000)`);
  }
  
  console.log('\n--- Seeding Complete ---');
  console.log(`Total Products: ${totalProductsSeeded}`);
  console.log(`Total Vendors: ${vendorProfiles.length}`);
}

run().catch(e => {
  console.error("Seeding failed:", e);
  process.exit(1);
}).finally(async () => {
  await mongoose.disconnect();
  await prisma.$disconnect();
});
