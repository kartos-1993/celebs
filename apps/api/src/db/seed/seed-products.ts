import mongoose from 'mongoose';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/celebs';

const MOCK_COLORS = [
  { name: 'Blue', code: '#0000FF', swatch: 'https://res.cloudinary.com/celebsnp/image/upload/v1783941189/celebs/products/qrxlasu3b8wercsjciod.png', images: [
    'https://res.cloudinary.com/celebsnp/image/upload/v1783941201/celebs/products/okt4fj4pzwhwqgidijnf.png',
    'https://res.cloudinary.com/celebsnp/image/upload/v1783941232/celebs/products/t4qusgbfbeg2klkkckaf.png'
  ]},
  { name: 'White', code: '#FFFFFF', swatch: 'https://res.cloudinary.com/celebsnp/image/upload/v1783941195/celebs/products/ioeovbgxm3zmjp8xjnwb.png', images: [
    'https://res.cloudinary.com/celebsnp/image/upload/v1783941207/celebs/products/l89jse9a50cqg3q5lazg.png',
    'https://res.cloudinary.com/celebsnp/image/upload/v1783941252/celebs/products/ajghejjs1oupup1o9ulz.png'
  ]},
  { name: 'Black', code: '#000000', swatch: 'https://res.cloudinary.com/celebsnp/image/upload/v1783941195/celebs/products/ioeovbgxm3zmjp8xjnwb.png', images: [
    'https://res.cloudinary.com/celebsnp/image/upload/v1783941142/celebs/products/bln3u0xtadrgtioonfsn.png',
    'https://res.cloudinary.com/celebsnp/image/upload/v1783941153/celebs/products/dy4aw7qrlnj3uzglqbk5.png'
  ]}
];

const MOCK_NAMES = [
  "Solid Ribbed Long Sleeve Polo Shirt, Old Money Style",
  "Casual Knit Buttoned Cardigan, Chic Autumn Collection",
  "Relaxed Fit Heavyweight Cotton Tee, Streetwear Essential",
  "Tailored Smart Casual Suit Jacket, Formal Elegant Style",
  "Slim Fit Premium Stretch Denim Pants, Everyday Classic",
  "Overized Drop Shoulder Hoodie, Cozy Leisurewear",
  "Classic Double-Breasted Wool Trench Coat, Winter Tailored"
];

const MOCK_BRANDS = ["Manfinity", "Celebs Co.", "Hypemode", "UrbanStyle", "OldMoney"];

const FASHION_PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800',
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800',
  'https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=800',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800',
  'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800',
  'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800',
  'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800',
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800',
  'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800',
  'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=800',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800',
  'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800',
];

async function run() {
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  try {
    // 1. Fetch categories and subcategories
    const allCategories = await CategoryModel.find();
    console.log(`Found ${allCategories.length} categories in database.`);

    const parentCategories = allCategories.filter(c => c.level === 1);
    const subCategories = allCategories.filter(c => c.level === 2);

    if (subCategories.length === 0) {
      console.warn("No subcategories found. Seed categories first.");
      return;
    }

    // 2. Clear existing products to ensure clean seed
    await ProductModel.deleteMany({});
    console.log("Cleared existing products.");

    const productsToInsert = [];
    const numProducts = 105; // Seed 100+ products

    for (let i = 0; i < numProducts; i++) {
      const subCat = subCategories[i % subCategories.length];
      const parentCat = parentCategories.find(c => String(c._id) === String(subCat.parentCategory)) || parentCategories[0];
      
      const brand = MOCK_BRANDS[i % MOCK_BRANDS.length];
      const baseName = MOCK_NAMES[i % MOCK_NAMES.length];
      const productName = `${brand} Men's ${baseName} - Vol ${i + 1}`;
      
      const price = 800 + (i * 25) % 2000;
      const discountedPrice = price > 1000 ? Math.round(price * 0.9) : undefined;

      const img1 = FASHION_PRODUCT_IMAGES[i % FASHION_PRODUCT_IMAGES.length];
      const img2 = FASHION_PRODUCT_IMAGES[(i + 1) % FASHION_PRODUCT_IMAGES.length];
      const mainImages = [img1, img2];
      
      // Dynamic attributes mapping
      const dynamicValues: Record<string, any> = {
        "Material": "Cotton Blend",
        "Pattern Type": i % 2 === 0 ? "Plain" : "Striped",
        "Fit Type": i % 3 === 0 ? "Relaxed" : i % 3 === 1 ? "Slim" : "Regular",
      };

      // Set sizes based on category requirements or defaults
      const selectedSizes = ['XS', 'S', 'M', 'L'];
      const columns = ['Shoulder', 'Bust', 'Length', 'Sleeve Length'];
      
      const sizesPayload = selectedSizes.map((size, sIdx) => {
        const measurements = (colName: string) => ({
          name: colName,
          value: String(40 + sIdx * 3 + (i % 5)),
          unit: 'cm'
        });
        return {
          name: size,
          productMeasurements: columns.map(c => measurements(c)),
          bodyMeasurements: columns.map(c => measurements(c))
        };
      });

      // Color variants
      const activeColors = MOCK_COLORS.slice(0, 2 + (i % 2));
      const colorVariants = activeColors.map((color, cIdx) => {
        const variantImg = FASHION_PRODUCT_IMAGES[(i + cIdx * 2) % FASHION_PRODUCT_IMAGES.length];
        return {
          name: color.name,
          colorCode: color.code,
          images: [variantImg],
          stocks: selectedSizes.map(size => ({
            size,
            quantity: 10 + (i % 5)
          }))
        };
      });

      const colorMeta: Record<string, any> = {};
      activeColors.forEach((color, cIdx) => {
        const variantImg = FASHION_PRODUCT_IMAGES[(i + cIdx * 2) % FASHION_PRODUCT_IMAGES.length];
        colorMeta[color.name] = {
          swatch: variantImg,
          images: [variantImg],
          hot: i % 5 === 0
        };
      });

      const skuVariants: Record<string, any> = {};
      activeColors.forEach(color => {
        const sizeMap: Record<string, any> = {};
        selectedSizes.forEach(size => {
          sizeMap[size] = {
            price: String(price),
            specialPrice: discountedPrice ? String(discountedPrice) : "",
            stock: String(10 + (i % 5)),
            sellerSku: `SKU-${i}-${color.name}-${size}`,
            available: true
          };
        });
        skuVariants[color.name] = { Size: sizeMap };
      });

      const dynamicData = {
        values: {
          mainImage: mainImages,
          Color: activeColors.map(c => c.name),
          Size: selectedSizes,
          variants: { colorMeta },
          sku: { variants: { Color: skuVariants } },
          ...dynamicValues
        },
        uploadedAssets: {
          mainImages,
          colorMeta
        },
        variantFields: [
          { key: "Color", label: "Color", kind: "color", ui: "VariantList" },
          { key: "Size", label: "Size", kind: "size", ui: "multiselect" }
        ]
      };

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

      productsToInsert.push({
        name: productName,
        slug: `${slugify(productName)}-${i}`,
        brand,
        description: `Premium mock listing for ${productName}. Crafted from custom details, this piece boasts incredible detail and represents outstanding old money fashion style. Perfect for full stack catalog testing.`,
        price,
        discountedPrice,
        category: parentCat._id,
        subcategory: subCat._id,
        sizes: sizesPayload,
        colorVariants,
        mainImages,
        dynamicData,
        tags: ['New', 'Trending', brand.toLowerCase()],
        featured: i % 10 === 0,
        status: 'published',
        createdBy: 'system-seed',
        updatedBy: 'system-seed'
      });
    }

    await ProductModel.insertMany(productsToInsert);
    console.log(`Successfully seeded ${productsToInsert.length} realistic clothing products.`);

  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run().catch(e => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
