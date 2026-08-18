import prisma from '../../config/db.prisma';

export const SEED_BRANDS = [
  // ── 1P Platforms (Celebs In-House Labels) ──
  {
    name: 'Celebs Official',
    slug: 'celebs-official',
    tier: 'FIRST_PARTY' as const,
    isGated: true,
    description: 'Flagship contemporary urban apparel designed for the modern lifestyle.',
    story: 'Born in Kathmandu, Celebs Official brings premium runway silhouettes and daily luxury to Nepal with strict fabric standards and authentic craftsmanship.',
    countryOfOrigin: 'Nepal',
    logoUrl: 'https://media.celebs.com.np/platform/branding/celebs-official-logo.webp',
  },
  {
    name: 'Celebs Denim',
    slug: 'celebs-denim',
    tier: 'FIRST_PARTY' as const,
    isGated: true,
    description: 'Engineered high-retention denim, jeans, jackets, and timeless western cuts.',
    story: 'Heavyweight selvedge, ring-spun cotton, and precision enzyme washes crafted to withstand every adventure across the Himalayas.',
    countryOfOrigin: 'Nepal',
    logoUrl: 'https://media.celebs.com.np/platform/branding/celebs-denim-logo.webp',
  },
  {
    name: 'Celebs Ethnic',
    slug: 'celebs-ethnic',
    tier: 'FIRST_PARTY' as const,
    isGated: true,
    description: 'Festive Kurtis, fusion silhouettes, and traditional celebratory wear.',
    story: 'Celebrating Nepali heritage through intricate handwork, silk blends, and contemporary Dashain/Tihar palettes.',
    countryOfOrigin: 'Nepal',
    logoUrl: 'https://media.celebs.com.np/platform/branding/celebs-ethnic-logo.webp',
  },
  {
    name: 'Celebs Basics',
    slug: 'celebs-basics',
    tier: 'FIRST_PARTY' as const,
    isGated: true,
    description: '100% Combed cotton everyday tees, loungewear, and minimalist staples.',
    story: 'Heavyweight organic cotton essentials engineered for unbeatable daily comfort and shape retention.',
    countryOfOrigin: 'Nepal',
    logoUrl: 'https://media.celebs.com.np/platform/branding/celebs-basics-logo.webp',
  },
  {
    name: 'Celebs Winterwear',
    slug: 'celebs-winterwear',
    tier: 'FIRST_PARTY' as const,
    isGated: true,
    description: 'Thermal fleeces, heavy puffer jackets, and alpine windbreakers.',
    story: 'Himalayan-grade insulation meets urban streetwear aesthetics for cold winter days.',
    countryOfOrigin: 'Nepal',
    logoUrl: 'https://media.celebs.com.np/platform/branding/celebs-winterwear-logo.webp',
  },

  // ── Gated Global Brands (LOA Required) ──
  {
    name: 'Nike',
    slug: 'nike',
    tier: 'GATED_GLOBAL' as const,
    isGated: true,
    description: 'World leading athletic footwear, apparel, and sports equipment.',
    story: 'Just Do It. Verified authorized dealership and authentic distribution.',
    countryOfOrigin: 'USA',
    logoUrl: 'https://media.celebs.com.np/platform/branding/nike-logo.webp',
  },
  {
    name: "Levi's",
    slug: 'levis',
    tier: 'GATED_GLOBAL' as const,
    isGated: true,
    description: 'The original denim pioneer since 1873.',
    story: 'Iconic 501s and durable workwear distributed through authorized retailers.',
    countryOfOrigin: 'USA',
    logoUrl: 'https://media.celebs.com.np/platform/branding/levis-logo.webp',
  },
  {
    name: 'Zara',
    slug: 'zara',
    tier: 'GATED_GLOBAL' as const,
    isGated: true,
    description: 'Global trendsetter in fast fashion and sophisticated European tailoring.',
    story: 'Rapid international trend collections with premium European styling.',
    countryOfOrigin: 'Spain',
    logoUrl: 'https://media.celebs.com.np/platform/branding/zara-logo.webp',
  },
  {
    name: 'Adidas',
    slug: 'adidas',
    tier: 'GATED_GLOBAL' as const,
    isGated: true,
    description: 'Performance sports and iconic Originals lifestyle apparel.',
    story: 'Through sport, we have the power to change lives.',
    countryOfOrigin: 'Germany',
    logoUrl: 'https://media.celebs.com.np/platform/branding/adidas-logo.webp',
  },

  // ── Generic Fallback ──
  {
    name: 'Generic / Unbranded',
    slug: 'generic-unbranded',
    tier: 'OPEN_GENERIC' as const,
    isGated: false,
    description: 'Standard unbranded catalog merchandise and OEM fashion.',
    story: 'Direct from manufacturer fashion without third-party trademark branding.',
    countryOfOrigin: 'Nepal',
    logoUrl: null,
  },
];

export async function seedBrands(): Promise<void> {
  console.log('\n--- 🏷️ Seeding Brand Registry (1P, Gated & Generic) ---');

  for (const brandData of SEED_BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: brandData.slug },
      update: {
        name: brandData.name,
        tier: brandData.tier,
        isGated: brandData.isGated,
        description: brandData.description,
        story: brandData.story,
        countryOfOrigin: brandData.countryOfOrigin,
        logoUrl: brandData.logoUrl,
      },
      create: {
        name: brandData.name,
        slug: brandData.slug,
        tier: brandData.tier,
        isGated: brandData.isGated,
        description: brandData.description,
        story: brandData.story,
        countryOfOrigin: brandData.countryOfOrigin,
        logoUrl: brandData.logoUrl,
      },
    });

    // If gated brand, create anti-hijack protection pattern
    if (brand.isGated && brand.tier === 'GATED_GLOBAL') {
      const sanitizedName = brand.name.replace(/[^a-zA-Z0-9]/g, '\\s*');
      const pattern = `(?i)\\b(${sanitizedName})\\b`;

      const existingRule = await prisma.brandProtectionRule.findFirst({
        where: { brandId: brand.id },
      });

      if (!existingRule) {
        await prisma.brandProtectionRule.create({
          data: {
            brandId: brand.id,
            pattern,
            matchField: 'TITLE_AND_DESCRIPTION',
            isActive: true,
          },
        });
      }
    }

    console.log(`  ✓ Brand: ${brand.name} [Tier: ${brand.tier}, Gated: ${brand.isGated}]`);
  }

  // Link existing products to Celebs Denim / Celebs Official where appropriate
  const celebsDenim = await prisma.brand.findUnique({ where: { slug: 'celebs-denim' } });
  if (celebsDenim) {
    const updated = await prisma.product.updateMany({
      where: {
        OR: [
          { name: { contains: 'Denim', mode: 'insensitive' } },
          { name: { contains: 'Jeans', mode: 'insensitive' } },
        ],
        brandId: null,
      },
      data: {
        brandId: celebsDenim.id,
        brand: celebsDenim.name,
      },
    });
    if (updated.count > 0) {
      console.log(`  🔗 Linked ${updated.count} existing Denim products to '${celebsDenim.name}'`);
    }
  }

  console.log('✅ Brand Registry Seed Complete.\n');
}

if (require.main === module) {
  seedBrands()
    .catch((err) => {
      console.error('❌ Failed to seed brands:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
