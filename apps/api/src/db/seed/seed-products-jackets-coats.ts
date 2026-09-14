import fs from 'fs';

import { createProductSchema } from '@celebs/shared-types';

import prisma from '../../config/db.prisma';

/**
 * Seeds SHEIN-extractor product batches exactly like vendor form uploads:
 * transform uploader dialect -> validate with the shared contract -> create
 * as draft -> submit -> approve, all through ProductService (same tx,
 * inventory sync, media claim, brand guards, publish floor as the UI).
 *
 * Idempotent: products whose name already exists are skipped, so re-runs and
 * later edits by id/slug are safe.
 *
 * Usage:
 *   dotenv -e .env.development -- node -r tsconfig-paths/register \
 *     -r @swc-node/register src/db/seed/seed-products-jackets-coats.ts \
 *     --file "C:/path/to/batch.json" [--vendor hoopsglam] [--dry-run]
 */

// File subcategory slugs may predate canonical category slugs.
const SUBCATEGORY_SLUG_MAP: Record<string, string> = {
  'men-jackets': 'men-jackets-and-coats',
  'men-zip-up-hoodies': 'men-zip-up-hoodies',
};

const SEED_NOTE = 'Seed import: SHEIN extractor batch (form-path seeding)';

interface SeedColorVariant {
  name?: string;
  colorCode?: string;
  swatch?: string;
  swatchImage?: string;
  images?: string[];
  stocks?: Array<{ size?: string; quantity?: number }>;
}

interface SeedSku {
  skuCode?: string;
  selectedOptions?: Record<string, string>;
  price?: number;
  discountedPrice?: number | null;
  stock?: number;
  image?: string;
  isDefault?: boolean;
}

interface SeedItem {
  name?: string;
  title?: string;
  brand?: string;
  description?: string;
  price?: number;
  discountedPrice?: number | null;
  category?: string;
  categoryPath?: string;
  subcategory?: string;
  subcategoryId?: string;
  slug?: string;
  tags?: string[];
  mainImages?: string[];
  sizes?: unknown[];
  colorVariants?: SeedColorVariant[];
  skus?: SeedSku[];
  variantOptions?: Array<{ name: string; values: string[] }>;
  dynamicData?: {
    values?: Record<string, unknown>;
  };
}

function transformItem(item: SeedItem) {
  const colorVariants = (item.colorVariants ?? []).map((c) => ({
    name: String(c.name ?? 'Default'),
    colorCode: String(c.colorCode ?? '#000000'),
    swatch: c.swatch || undefined,
    images: c.images ?? [],
    stocks: (c.stocks ?? []).map((s) => ({
      size: String(s.size ?? 'Default'),
      quantity: s.quantity ?? 0,
    })),
  }));

  const skus = (item.skus ?? []).map((s, i) => ({
    skuCode: String(s.skuCode ?? ''),
    selectedOptions: s.selectedOptions ?? {},
    price: s.price ?? 0,
    discountedPrice: s.discountedPrice ?? undefined,
    stock: s.stock ?? 0,
    image: s.image || undefined,
    isDefault: i === 0,
  }));

  const colorMeta: Record<string, { swatch?: string; images: string[]; hot: boolean }> = {};
  for (const c of colorVariants) {
    colorMeta[c.name] = { swatch: c.swatch, images: c.images, hot: false };
  }

  return {
    name: String(item.name ?? item.title ?? ''),
    brand: item.brand || undefined,
    description: item.description ?? '',
    price: item.price ?? 0,
    discountedPrice: item.discountedPrice ?? undefined,
    sizes: item.sizes ?? [],
    colorVariants,
    skus,
    variantOptions: item.variantOptions ?? [],
    mainImages: item.mainImages ?? [],
    dynamicData: {
      values: item.dynamicData?.values ?? {},
      variants: { colorMeta },
    },
    tags: item.tags ?? [],
    featured: false,
    status: 'draft' as const,
  };
}

export async function seedProductsJacketsCoats(
  filePath: string,
  opts: { vendorShopName?: string; dryRun?: boolean; limit?: number } = {},
): Promise<void> {
  const stamp = () => new Date().toISOString().slice(11, 23);
  const vendorShopName = opts.vendorShopName ?? 'hoopsglam';
  console.log(`[${stamp()}] 🧥 Seeding jackets/coats batch from: ${filePath}`);
  console.log(
    `[${stamp()}]    Vendor: ${vendorShopName}${opts.dryRun ? ' (DRY RUN — no writes)' : ''}${opts.limit ? ` (LIMIT ${opts.limit})` : ''}`,
  );

  console.log(`[${stamp()}] [1/5] reading batch file…`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const allItems = JSON.parse(raw) as SeedItem[];
  if (!Array.isArray(allItems)) throw new Error('Seed file must contain a JSON array');
  const items = typeof opts.limit === 'number' ? allItems.slice(0, opts.limit) : allItems;
  console.log(`[${stamp()}] [1/5] loaded ${items.length}/${allItems.length} products`);

  console.log(`[${stamp()}] [2/5] resolving vendor "${vendorShopName}"…`);
  const vendor = await prisma.vendorProfile.findFirst({
    where: { shopName: { equals: vendorShopName, mode: 'insensitive' } },
  });
  if (!vendor) {
    const existing = await prisma.vendorProfile.findMany({ select: { shopName: true } });
    throw new Error(
      `Vendor "${vendorShopName}" not found. Available: ${existing.map((v) => v.shopName).join(', ') || '(none)'}`,
    );
  }
  console.log(`[${stamp()}] [2/5] vendor ok: ${vendor.id} (${vendor.shopName})`);

  // Resolve + cache leaf categories by mapped slug.
  const leafCache = new Map<string, { categoryId: string; subcategoryId: string }>();
  const resolveLeaf = async (fileSlug: string) => {
    const hit = leafCache.get(fileSlug);
    if (hit) return hit;
    const slug = SUBCATEGORY_SLUG_MAP[fileSlug] ?? fileSlug;
    const leaf = await prisma.category.findFirst({ where: { slug } });
    if (!leaf) throw new Error(`Category slug "${slug}" (file key "${fileSlug}") not found`);
    const resolved = {
      categoryId: leaf.parentCategory ?? leaf.id,
      subcategoryId: leaf.id,
    };
    leafCache.set(fileSlug, resolved);
    return resolved;
  };

  // Heavy service graph loads only when writes actually happen — dry runs stay light.
  const service = opts.dryRun
    ? null
    : new (await import('../../modules/product/product.service')).ProductService();
  console.log(
    `[${stamp()}] [3/5] ${opts.dryRun ? 'validation-only mode (service not loaded)' : 'service loaded'}`,
  );

  const report: Array<{ name: string; result: string; id?: string; detail?: string }> = [];

  let n = 0;
  for (const item of items) {
    n += 1;
    const name = String(item.name ?? item.title ?? '(unnamed)');
    console.log(`[${stamp()}] [4/5] product ${n}/${items.length}: ${name.slice(0, 60)}`);
    try {
      const { categoryId, subcategoryId } = await resolveLeaf(String(item.subcategoryId ?? ''));

      const payload = transformItem(item);
      const parsed = createProductSchema.parse({
        ...payload,
        categoryId,
        subcategoryId,
      });

      if (opts.dryRun || !service) {
        report.push({ name, result: 'valid' });
        continue;
      }

      const already = await prisma.product.findFirst({ where: { name } });
      if (already) {
        report.push({ name, result: 'skipped (exists)', id: already.id });
        continue;
      }

      const created = (await service.createProduct(
        parsed,
        vendor.userId,
        vendor.id,
        vendor.shopName,
      )) as { id?: string } | null;
      const id = String(created?.id ?? '');
      if (!id) throw new Error('createProduct returned no id');

      await service.submitProductForReview(id, vendor.id, false);
      await service.reviewProduct(id, {
        action: 'approve',
        reviewerId: vendor.userId,
        reviewerName: vendor.shopName,
        note: SEED_NOTE,
      });

      report.push({ name, result: 'published', id });
      console.log(`   ✅ ${name} -> ${id}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message.slice(0, 300) : String(err);
      report.push({ name, result: 'FAILED', detail });
      console.error(`   ❌ ${name}: ${detail}`);
    }
  }

  const counts = report.reduce<Record<string, number>>((acc, r) => {
    acc[r.result] = (acc[r.result] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\n📊 ${JSON.stringify(counts)} — ${report.length} items processed.`);
  const failed = report.filter((r) => r.result === 'FAILED');
  if (failed.length > 0) process.exitCode = 1;
}

if (require.main === module) {
  const flag = (name: string) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const file = flag('--file');
  const vendorShopName = flag('--vendor');
  const limitRaw = flag('--limit');
  const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
  const dryRun = process.argv.includes('--dry-run');
  if (!file) {
    console.error(
      'Usage: seed-products-jackets-coats.ts --file <path> [--vendor <shop>] [--dry-run] [--limit N]',
    );
    process.exit(1);
  }
  seedProductsJacketsCoats(file, { vendorShopName, dryRun, limit })
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      // Open handles (pooler/queue clients pulled in via the service graph)
      // keep the loop alive — the work is done, exit explicitly.
      process.exit(process.exitCode ?? 0);
    });
}
