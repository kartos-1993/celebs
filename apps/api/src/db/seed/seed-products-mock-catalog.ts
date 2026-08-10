import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { connectDb, disconnectDb } from './config';

const MOCK_COLORS = [
  {
    name: 'Blue',
    code: '#0000FF',
    images: [
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941201/celebs/products/okt4fj4pzwhwqgidijnf.png',
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941232/celebs/products/t4qusgbfbeg2klkkckaf.png',
    ],
  },
  {
    name: 'White',
    code: '#FFFFFF',
    images: [
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941207/celebs/products/l89jse9a50cqg3q5lazg.png',
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941252/celebs/products/ajghejjs1oupup1o9ulz.png',
    ],
  },
  {
    name: 'Black',
    code: '#000000',
    images: [
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941142/celebs/products/bln3u0xtadrgtioonfsn.png',
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941153/celebs/products/dy4aw7qrlnj3uzglqbk5.png',
    ],
  },
];

const MOCK_NAMES = [
  'Solid Ribbed Long Sleeve Polo Shirt, Old Money Style',
  'Casual Knit Buttoned Cardigan, Chic Autumn Collection',
  'Relaxed Fit Heavyweight Cotton Tee, Streetwear Essential',
  'Tailored Smart Casual Suit Jacket, Formal Elegant Style',
  'Slim Fit Premium Stretch Denim Pants, Everyday Classic',
  'Oversized Drop Shoulder Hoodie, Cozy Leisurewear',
  'Classic Double-Breasted Wool Trench Coat, Winter Tailored',
];

const MOCK_BRANDS = ['Manfinity', 'Celebs Co.', 'Hypemode', 'UrbanStyle', 'OldMoney'];

const FASHION_PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800',
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800',
  'https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=800',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800',
  'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800',
];

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

export async function seedProductsMockCatalog(isReset = false): Promise<void> {
  console.log('\n🛍️ Seeding Mock Catalog Products...');
  await connectDb();

  const allCategories = await CategoryModel.find();
  const parentCategories = allCategories.filter((c) => c.level === 1);
  const subCategories = allCategories.filter((c) => c.level === 2);

  if (subCategories.length === 0) {
    console.warn('  └─ No subcategories found. Seed categories first.');
    return;
  }

  if (isReset) {
    console.log('  └─ [--reset active] Wiping Product collection...');
    await ProductModel.deleteMany({});
  }

  const numProducts = 30;
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < numProducts; i++) {
    const subCat = subCategories[i % subCategories.length];
    const parentCat =
      parentCategories.find((c) => String(c.id) === String(subCat.parentCategory)) ||
      parentCategories[0];

    const brand = MOCK_BRANDS[i % MOCK_BRANDS.length];
    const baseName = MOCK_NAMES[i % MOCK_NAMES.length];
    const productName = `${brand} Men's ${baseName} - Vol ${i + 1}`;
    const productSlug = `${slugify(productName)}-mock-${i}`;

    const price = 800 + ((i * 25) % 2000);
    const discountedPrice = price > 1000 ? Math.round(price * 0.9) : undefined;

    const img1 = FASHION_PRODUCT_IMAGES[i % FASHION_PRODUCT_IMAGES.length];
    const img2 = FASHION_PRODUCT_IMAGES[(i + 1) % FASHION_PRODUCT_IMAGES.length];
    const mainImages = [img1, img2];

    const selectedSizes = ['S', 'M', 'L', 'XL'];
    const columns = ['Shoulder', 'Bust', 'Length', 'Sleeve Length'];

    const sizesPayload = selectedSizes.map((size, sIdx) => {
      const measurements = (colName: string) => ({
        name: colName,
        value: String(40 + sIdx * 3 + (i % 5)),
        unit: 'cm',
      });
      const bodyCols = [
        { name: 'Height', value: `${165 + sIdx * 5}-${170 + sIdx * 5}` },
        { name: 'Bust', value: `${84 + sIdx * 4}-${88 + sIdx * 4}` },
        { name: 'Waist Size', value: `${68 + sIdx * 4}-${72 + sIdx * 4}` },
        { name: 'Hip Size', value: `${90 + sIdx * 4}-${94 + sIdx * 4}` },
      ];
      return {
        name: size,
        productMeasurements: columns.map((c) => measurements(c)),
        bodyMeasurements: bodyCols.map((b) => ({ name: b.name, value: b.value, unit: 'cm' })),
      };
    });

    const activeColors = MOCK_COLORS.slice(0, 2 + (i % 2));
    const colorVariants = activeColors.map((color, cIdx) => {
      const variantImg = FASHION_PRODUCT_IMAGES[(i + cIdx * 2) % FASHION_PRODUCT_IMAGES.length];
      return {
        name: color.name,
        colorCode: color.code,
        images: [variantImg],
        stocks: selectedSizes.map((size) => ({
          size,
          quantity: 10 + (i % 5),
        })),
      };
    });

    const productDoc = {
      name: productName,
      slug: productSlug,
      brand,
      description: `Premium mock listing for ${productName}. Ideal for full stack catalog testing.`,
      price,
      discountedPrice,
      category: parentCat.id,
      subcategory: subCat.id,
      sizes: sizesPayload,
      colorVariants,
      mainImages,
      dynamicData: {
        values: {
          mainImage: mainImages,
          Color: activeColors.map((c) => c.name),
          Size: selectedSizes,
        },
      },
      tags: ['New', 'Trending', brand.toLowerCase()],
      featured: i % 5 === 0,
      status: 'published' as const,
      createdBy: 'system-seed',
      updatedBy: 'system-seed',
    };

    const result = await ProductModel.updateOne(
      { slug: productDoc.slug },
      { $set: productDoc },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      insertedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(
    `✅ Seeded Mock Catalog Products: ${insertedCount} inserted, ${updatedCount} updated.`,
  );
}

if (require.main === module) {
  const isReset = process.argv.includes('--reset');
  seedProductsMockCatalog(isReset)
    .then(() => disconnectDb())
    .catch((err) => {
      console.error('❌ Seeding mock products failed:', err);
      disconnectDb();
      process.exit(1);
    });
}
