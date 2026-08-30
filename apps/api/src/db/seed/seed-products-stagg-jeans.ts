import crypto from 'crypto';

import prisma from '../../config/db.prisma';

/**
 * STAGG jeans — 3 products covering the lifecycle for superadmin vs store-owner verification.
 * - draft: owner-only, not in mobile feed, not in review queue
 * - pending_review: in superadmin review queue, owner sees pending
 * - published: in mobile feed + storefront
 *
 * Attach to an APPROVED VendorProfile so `requireStoreState(['APPROVED'])` guards pass.
 * Idempotent via fixed slugs: stagg-jeans-skinny, stagg-jeans-straight, stagg-jeans-cargo
 */

const STAGG_SLUGS = [
  'stagg-jeans-skinny-vintage-blue',
  'stagg-jeans-straight-light-wash',
  'stagg-jeans-cargo-ash-grey',
] as const;

function slugify(name: string, suffix: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}-${suffix}`;
}

export async function seedProductsStaggJeans(): Promise<void> {
  console.log('\n👖 Seeding STAGG Jeans (staged lifecycle: draft / pending_review / published)...');

  // 1. Resolve Men Jeans category (Men > Men Denim > Men Jeans)
  let denimJeansCat = await prisma.category.findFirst({
    where: { OR: [{ slug: 'men-jeans' }, { name: 'Men Jeans' }] },
  });
  if (!denimJeansCat) {
    // Fallback: ensure via seed-categories-men tree then retry
    const menDenim = await prisma.category.findFirst({ where: { slug: 'men-denim' } });
    if (!menDenim) throw new Error('Category Men Denim not found. Run seedCategoriesMen first.');
    denimJeansCat = await prisma.category.create({
      data: {
        name: 'Men Jeans',
        slug: 'men-jeans',
        level: 3,
        parentCategory: menDenim.id,
        path: `${menDenim.path}/men-jeans`,
        sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
        bodyChartColumns: ['Height', 'Waist Size', 'Hip Size'],
        isActive: true,
      },
    });
  }
  const categoryId = denimJeansCat.parentCategory || denimJeansCat.id;
  const subcategoryId = denimJeansCat.id;
  console.log(
    `  └─ Category: ${denimJeansCat.name} (${denimJeansCat.slug}) cat=${categoryId} sub=${subcategoryId}`,
  );

  // 2. Resolve an APPROVED vendor + user for attribution
  let vendor = await prisma.vendorProfile.findFirst({
    where: { status: 'APPROVED' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  // If no approved vendor, approve the most recent PENDING one, or create a synthetic stag store
  if (!vendor) {
    const pending = await prisma.vendorProfile.findFirst({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'REJECTED'] } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      vendor = await prisma.vendorProfile.update({
        where: { id: pending.id },
        data: { status: 'APPROVED' },
        include: { user: true },
      });
      console.log(
        `  └─ Promoted vendor ${vendor.shopName} (${vendor.id}) to APPROVED for STAGG seeding`,
      );
    } else {
      // Create synthetic stag vendor + user
      const email = `stagg-denim-${Date.now()}@celebs.test`;
      const user = await prisma.user.create({
        data: {
          name: 'STAGG Denim Store Owner',
          email,
          password: crypto.randomBytes(16).toString('hex'),
          role: 'VENDOR',
          isEmailVerified: true,
        },
      });
      vendor = await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          shopName: `STAGG Denim Lab ${Date.now().toString().slice(-5)}`,
          shopDescription: 'STAGG seed store for lifecycle QA',
          phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
          panNumber: `STAGG-PAN-${Date.now()}`,
          citizenshipNumber: `STAGG-CIT-${Date.now()}`,
          status: 'APPROVED',
        },
        include: { user: true },
      });
      // Link user.vendorId for staff scoping
      await prisma.user.update({ where: { id: user.id }, data: { vendorId: vendor.id } });
      console.log(
        `  └─ Created synthetic STAGG vendor ${vendor.shopName} (${vendor.id}) user=${email}`,
      );
    }
  } else {
    console.log(
      `  └─ Vendor: ${vendor.shopName} (${vendor.id}) status=${vendor.status} user=${vendor.user.email}`,
    );
  }

  const vendorId = vendor.id;
  const vendorName = vendor.shopName;
  const createdBy = vendor.userId;

  // Verified working Unsplash image set (all return 200)
  const IMG_A =
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop';
  const IMG_B =
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop';
  const IMG_C =
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop';
  const IMG_D =
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop';
  const IMG_E =
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop';
  const SW_A = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop';
  const SW_B = 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&h=200&fit=crop';
  const SW_C = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop';
  const SW_D = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&h=200&fit=crop';

  // 3. Define 3 STAGG products with SHEIN-style variant matrix
  const definitions = [
    {
      slug: STAGG_SLUGS[0],
      name: 'STAGG Skinny High-Waist Jeans - Vintage Blue',
      brand: 'CELEBS Denim',
      price: 2990,
      discountedPrice: 2490,
      status: 'draft' as const,
      description:
        'STAGG STAGE 1 — DRAFT. Skinny high-waist stretch denim. Vendor-only visibility. Use this to verify store-owner Draft tab and superadmin NOT in review queue.',
      mainImages: [IMG_A, IMG_B, IMG_C, IMG_D],
      colorVariants: [
        {
          name: 'Vintage Blue',
          colorCode: '#5a7d9a',
          swatch: SW_A,
          images: [IMG_A, IMG_B],
          stocks: [
            { size: 'XS', quantity: 25 },
            { size: 'S', quantity: 25 },
            { size: 'M', quantity: 25 },
            { size: 'L', quantity: 25 },
            { size: 'XL', quantity: 25 },
          ],
        },
        {
          name: 'Midnight Black',
          colorCode: '#0f0f0f',
          swatch: SW_B,
          images: [IMG_B, IMG_C],
          stocks: [
            { size: 'XS', quantity: 18 },
            { size: 'S', quantity: 18 },
            { size: 'M', quantity: 18 },
            { size: 'L', quantity: 18 },
            { size: 'XL', quantity: 18 },
          ],
        },
        {
          name: 'Stone Wash',
          colorCode: '#a8b5c2',
          swatch: SW_C,
          images: [IMG_C, IMG_D],
          stocks: [
            { size: 'XS', quantity: 12 },
            { size: 'S', quantity: 12 },
            { size: 'M', quantity: 12 },
            { size: 'L', quantity: 12 },
            { size: 'XL', quantity: 12 },
          ],
        },
      ],
      sizes: [
        {
          name: 'XS',
          productMeasurements: [
            { name: 'Waist Size', value: '62', unit: 'cm' },
            { name: 'Hip Size', value: '88', unit: 'cm' },
            { name: 'Length', value: '98', unit: 'cm' },
            { name: 'Thigh', value: '48', unit: 'cm' },
          ],
        },
        {
          name: 'S',
          productMeasurements: [
            { name: 'Waist Size', value: '66', unit: 'cm' },
            { name: 'Hip Size', value: '92', unit: 'cm' },
            { name: 'Length', value: '100', unit: 'cm' },
            { name: 'Thigh', value: '50', unit: 'cm' },
          ],
        },
        {
          name: 'M',
          productMeasurements: [
            { name: 'Waist Size', value: '70', unit: 'cm' },
            { name: 'Hip Size', value: '96', unit: 'cm' },
            { name: 'Length', value: '102', unit: 'cm' },
            { name: 'Thigh', value: '52', unit: 'cm' },
          ],
        },
        {
          name: 'L',
          productMeasurements: [
            { name: 'Waist Size', value: '76', unit: 'cm' },
            { name: 'Hip Size', value: '102', unit: 'cm' },
            { name: 'Length', value: '104', unit: 'cm' },
            { name: 'Thigh', value: '55', unit: 'cm' },
          ],
        },
        {
          name: 'XL',
          productMeasurements: [
            { name: 'Waist Size', value: '82', unit: 'cm' },
            { name: 'Hip Size', value: '108', unit: 'cm' },
            { name: 'Length', value: '106', unit: 'cm' },
            { name: 'Thigh', value: '58', unit: 'cm' },
          ],
        },
      ],
      dynamicData: {
        values: {
          'Fit Type': 'Skinny',
          Type: 'Skinny',
          Length: 'Long',
          Season: 'All',
          Details: ['Washed', 'High Stretch'],
        },
        variants: {
          colorMeta: {
            '#5a7d9a': { name: 'Vintage Blue', swatch: SW_A, images: [IMG_A, IMG_B] },
            '#0f0f0f': { name: 'Midnight Black', swatch: SW_B, images: [IMG_B, IMG_C] },
            '#a8b5c2': { name: 'Stone Wash', swatch: SW_C, images: [IMG_C, IMG_D] },
          },
        },
      },
    },
    {
      slug: STAGG_SLUGS[1],
      name: 'STAGG Straight Loose Jeans - Light Wash',
      brand: 'CELEBS Denim',
      price: 3490,
      discountedPrice: 2990,
      status: 'pending_review' as const,
      description:
        'STAGG STAGE 2 — PENDING_REVIEW. Straight loose light-wash denim. Should appear in Superadmin Review Queue (Pending QC) and store-owner Pending tab. Verify approve/reject flow here.',
      mainImages: [IMG_B, IMG_D, IMG_E],
      colorVariants: [
        {
          name: 'Light Wash',
          colorCode: '#d6e2eb',
          swatch: SW_B,
          images: [IMG_B, IMG_D],
          stocks: [
            { size: 'S', quantity: 22 },
            { size: 'M', quantity: 22 },
            { size: 'L', quantity: 22 },
            { size: 'XL', quantity: 22 },
          ],
        },
        {
          name: 'Dark Indigo',
          colorCode: '#2c3e50',
          swatch: SW_D,
          images: [IMG_D, IMG_E],
          stocks: [
            { size: 'S', quantity: 20 },
            { size: 'M', quantity: 20 },
            { size: 'L', quantity: 20 },
            { size: 'XL', quantity: 20 },
          ],
        },
      ],
      sizes: [
        {
          name: 'S',
          productMeasurements: [
            { name: 'Waist Size', value: '68', unit: 'cm' },
            { name: 'Hip Size', value: '94', unit: 'cm' },
            { name: 'Length', value: '101', unit: 'cm' },
            { name: 'Thigh', value: '54', unit: 'cm' },
          ],
        },
        {
          name: 'M',
          productMeasurements: [
            { name: 'Waist Size', value: '74', unit: 'cm' },
            { name: 'Hip Size', value: '100', unit: 'cm' },
            { name: 'Length', value: '103', unit: 'cm' },
            { name: 'Thigh', value: '56', unit: 'cm' },
          ],
        },
        {
          name: 'L',
          productMeasurements: [
            { name: 'Waist Size', value: '80', unit: 'cm' },
            { name: 'Hip Size', value: '106', unit: 'cm' },
            { name: 'Length', value: '105', unit: 'cm' },
            { name: 'Thigh', value: '59', unit: 'cm' },
          ],
        },
        {
          name: 'XL',
          productMeasurements: [
            { name: 'Waist Size', value: '86', unit: 'cm' },
            { name: 'Hip Size', value: '112', unit: 'cm' },
            { name: 'Length', value: '107', unit: 'cm' },
            { name: 'Thigh', value: '62', unit: 'cm' },
          ],
        },
      ],
      dynamicData: {
        values: {
          'Fit Type': 'Loose',
          Type: 'Straight',
          Length: 'Long',
          Season: 'Spring/Fall',
          Details: ['Washed', 'Comfortable'],
        },
        variants: {
          colorMeta: {
            '#d6e2eb': { name: 'Light Wash', swatch: SW_B, images: [IMG_B, IMG_D] },
            '#2c3e50': { name: 'Dark Indigo', swatch: SW_D, images: [IMG_D, IMG_E] },
          },
        },
      },
    },
    {
      slug: STAGG_SLUGS[2],
      name: 'STAGG Wide Cargo Baggy Jeans - Ash Grey',
      brand: 'CELEBS Denim',
      price: 3990,
      discountedPrice: 3590,
      status: 'published' as const,
      description:
        'STAGG STAGE 3 — PUBLISHED. Wide cargo baggy ash-grey. Should be in mobile infinite feed (GET /products), storefront, and superadmin Published tab.',
      mainImages: [IMG_E, IMG_A, IMG_C, IMG_B],
      colorVariants: [
        {
          name: 'Ash Grey',
          colorCode: '#8a9199',
          swatch: SW_D,
          images: [IMG_E, IMG_A],
          stocks: [
            { size: 'S', quantity: 30 },
            { size: 'M', quantity: 30 },
            { size: 'L', quantity: 30 },
            { size: 'XL', quantity: 30 },
          ],
        },
        {
          name: 'Washed Black',
          colorCode: '#1a1a1a',
          swatch: SW_B,
          images: [IMG_B, IMG_C],
          stocks: [
            { size: 'S', quantity: 28 },
            { size: 'M', quantity: 28 },
            { size: 'L', quantity: 28 },
            { size: 'XL', quantity: 28 },
          ],
        },
      ],
      sizes: [
        {
          name: 'S',
          productMeasurements: [
            { name: 'Waist Size', value: '70', unit: 'cm' },
            { name: 'Hip Size', value: '96', unit: 'cm' },
            { name: 'Length', value: '104', unit: 'cm' },
            { name: 'Thigh', value: '60', unit: 'cm' },
          ],
        },
        {
          name: 'M',
          productMeasurements: [
            { name: 'Waist Size', value: '76', unit: 'cm' },
            { name: 'Hip Size', value: '102', unit: 'cm' },
            { name: 'Length', value: '106', unit: 'cm' },
            { name: 'Thigh', value: '62', unit: 'cm' },
          ],
        },
        {
          name: 'L',
          productMeasurements: [
            { name: 'Waist Size', value: '82', unit: 'cm' },
            { name: 'Hip Size', value: '108', unit: 'cm' },
            { name: 'Length', value: '108', unit: 'cm' },
            { name: 'Thigh', value: '65', unit: 'cm' },
          ],
        },
        {
          name: 'XL',
          productMeasurements: [
            { name: 'Waist Size', value: '88', unit: 'cm' },
            { name: 'Hip Size', value: '114', unit: 'cm' },
            { name: 'Length', value: '110', unit: 'cm' },
            { name: 'Thigh', value: '68', unit: 'cm' },
          ],
        },
      ],
      dynamicData: {
        values: {
          'Fit Type': 'Wide Leg',
          Type: 'Cargo',
          Length: 'Long',
          Season: 'Winter',
          Details: ['Patched', 'Washed'],
        },
        variants: {
          colorMeta: {
            '#8a9199': { name: 'Ash Grey', swatch: SW_D, images: [IMG_E, IMG_A] },
            '#1a1a1a': { name: 'Washed Black', swatch: SW_B, images: [IMG_B, IMG_C] },
          },
        },
      },
      featured: true,
    },
  ];

  // 4. Upsert products + inventories
  for (const def of definitions) {
    const variantOptions = [
      { name: 'Color', values: def.colorVariants.map((c) => c.name) },
      {
        name: 'Size',
        values: Array.from(new Set(def.colorVariants.flatMap((c) => c.stocks.map((s) => s.size)))),
      },
    ];

    // Derive skus JSON for matrix
    const skus = def.colorVariants.flatMap((cv) =>
      cv.stocks.map((st) => ({
        id: `${def.slug}-${cv.name.toLowerCase().replace(/\s+/g, '-')}-${st.size}`.slice(0, 48),
        skuCode: `STAGG-${cv.name.slice(0, 3).toUpperCase()}-${st.size}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        selectedOptions: { Color: cv.name, Size: st.size },
        price: def.price,
        discountedPrice: def.discountedPrice,
        stock: st.quantity,
        image: cv.images[0] || def.mainImages[0],
        isDefault: false,
      })),
    );

    const baseData: Record<string, unknown> = {
      name: def.name,
      slug: def.slug,
      brand: def.brand,
      brandId: null,
      description: def.description,
      price: def.price,
      discountedPrice: def.discountedPrice,
      status: def.status,
      featured: (def as Record<string, unknown>).featured ?? false,
      mainImages: def.mainImages,
      tags: ['denim', 'jeans', 'stagg', 'men', 'qa'],
      sizes: def.sizes,
      colorVariants: def.colorVariants,
      skus,
      variantOptions,
      dynamicData: def.dynamicData,
      categoryId,
      subcategoryId,
      vendorId,
      vendorName,
      createdBy,
      updatedBy: createdBy,
    };

    const product = await prisma.product.upsert({
      where: { slug: def.slug },
      update: {
        ...baseData,
        updatedBy: createdBy,
        updatedAt: new Date(),
      },
      create: {
        ...baseData,
      } as never,
    });

    console.log(`  └─ ${def.status.padEnd(15)} ${product.name} [${product.slug}] id=${product.id}`);

    // Sync inventory rows (upsert per variant+size)
    for (const cv of def.colorVariants) {
      for (const st of cv.stocks) {
        const sku = `STAGG-${product.id.slice(0, 8)}-${cv.name.slice(0, 3).toUpperCase()}-${st.size}`;
        await prisma.productInventory.upsert({
          where: {
            productId_colorVariantName_size: {
              productId: product.id,
              colorVariantName: cv.name,
              size: st.size,
            },
          },
          update: { sku, quantity: st.quantity, reservedQuantity: 0 },
          create: {
            productId: product.id,
            colorVariantName: cv.name,
            size: st.size,
            sku,
            quantity: st.quantity,
            reservedQuantity: 0,
          },
        });
      }
    }
    const invCount = await prisma.productInventory.count({ where: { productId: product.id } });
    console.log(`     └─ inventories: ${invCount} rows`);

    // Prune orphan inventories no longer in definition
    const validPairs = new Set(
      def.colorVariants.flatMap((cv) => cv.stocks.map((s) => `${cv.name}::${s.size}`)),
    );
    const existingInvs = await prisma.productInventory.findMany({
      where: { productId: product.id },
    });
    for (const inv of existingInvs) {
      if (!validPairs.has(`${inv.colorVariantName}::${inv.size}`)) {
        // Guard: don't delete if orderItems exist
        const hasOrders = await prisma.orderItem.findFirst({ where: { inventoryId: inv.id } });
        if (!hasOrders) {
          await prisma.productInventory.delete({ where: { id: inv.id } });
          console.log(`     └─ pruned orphan inventory ${inv.colorVariantName}/${inv.size}`);
        }
      }
    }
  }

  console.log('\n✅ STAGG Jeans seeded. Verification:');
  console.log(
    `   Vendor: ${vendorName} (${vendorId}) user=${vendor.user.email} role=${vendor.user.role}`,
  );
  console.log(`   Slugs: ${STAGG_SLUGS.join(', ')}`);
  console.log(
    '   → Store owner (VENDOR) Manage Products: filter All/Draft/Pending/Published should show 3 rows scoped to vendor',
  );
  console.log(
    '   → Superadmin Review Queue: GET /products/review-product-queue should contain only the pending_review one',
  );
  console.log('   → Mobile feed GET /products (cursor, no auth) should return only published');
  console.log(
    '   → GET /products/:id for draft without owner/reviewer should 404 (product.controller.ts:94)',
  );
}

if (require.main === module) {
  (async () => {
    try {
      await seedProductsStaggJeans();
    } catch (e) {
      console.error('❌ STAGG seed failed', e);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  })();
}
