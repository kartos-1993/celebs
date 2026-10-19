import { afterAll, describe, expect, it } from 'vitest';

import { storefrontShortcutCache } from '../storefront-shortcut.cache';
import { storefrontShortcutService } from '../storefront-shortcut.service';

import prisma from '@/config/db.prisma';

/**
 * The public storefront config is the storefront's contract with the app:
 *
 *   - a shortcut an admin deactivated must not render, and must not be
 *     resurrected by the no-rows fallback;
 *   - the row title travels with the shortcut (the app labels the row with it);
 *   - the payload is cached per category slug, and a CRUD change invalidates it.
 *
 * These are integration tests against the local database and the local Redis:
 * the cache is the subject, so a fake Redis would test the fake.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Redis keys outlive the suite's per-test table truncation, so they are cleared
// explicitly: a rerun inside the 300s TTL must not be served a stale payload.
const cachedSlugs: string[] = [];

async function seedCategory() {
  const suffix = stamp();
  return prisma.category.create({
    data: {
      name: `Shortcut Config ${suffix}`,
      slug: `shortcut-config-${suffix}`,
      level: 1,
      path: `shortcut-config-${suffix}`,
      isActive: true,
    },
    select: { id: true, slug: true },
  });
}

async function seedChildCategory(parentCategoryId: string) {
  const suffix = stamp();
  return prisma.category.create({
    data: {
      name: `Shortcut Child ${suffix}`,
      slug: `shortcut-child-${suffix}`,
      level: 2,
      path: `shortcut-child-${suffix}`,
      parentCategory: parentCategoryId,
      isActive: true,
    },
    select: { id: true, slug: true },
  });
}

async function seedShortcut(
  categoryId: string,
  overrides: { title?: string; isActive?: boolean; displayOrder?: number; type?: string } = {},
) {
  return prisma.storefrontShortcut.create({
    data: {
      title: overrides.title ?? 'Shop by Brand',
      slug: `shortcut-${stamp()}`,
      categoryId,
      filterConfig: {
        type: overrides.type ?? 'brand',
        attributeId: null,
        displayAs: 'chip_list',
        items: [],
        autoPopulate: false,
        displayOrder: overrides.displayOrder ?? 0,
        isActive: overrides.isActive ?? true,
      },
    },
    select: { id: true, title: true },
  });
}

afterAll(async () => {
  await Promise.all(cachedSlugs.map((slug) => storefrontShortcutCache.invalidate(slug)));
});

describe('storefront shortcut config', () => {
  it('does not render a deactivated shortcut - and does not fall back to the synthetic row', async () => {
    const category = await seedCategory();
    await seedChildCategory(category.id);
    await seedShortcut(category.id, { title: 'Retired Row', isActive: false, type: 'subcategory' });
    cachedSlugs.push(category.slug);

    const config = await storefrontShortcutService.getStorefrontConfigBySlug(category.slug);

    // The stored row exists but is deactivated: no shortcuts render, and
    // crucially no synthesized "Subcategories" row - a deliberate deactivation
    // must not be undone by the no-rows fallback.
    expect(config.shortcuts).toHaveLength(0);
  });

  it('carries the row title, falling back to Subcategories', async () => {
    const category = await seedCategory();
    await seedShortcut(category.id, { title: 'Shop by Brand', displayOrder: 3 });
    await seedShortcut(category.id, { title: '' });
    cachedSlugs.push(category.slug);

    const config = await storefrontShortcutService.getStorefrontConfigBySlug(category.slug);

    const titles = config.shortcuts.map((shortcut) => shortcut.title);
    expect(titles).toContain('Shop by Brand');
    expect(titles).toContain('Subcategories');

    const branded = config.shortcuts.find((shortcut) => shortcut.title === 'Shop by Brand');
    expect(branded?.displayOrder).toBe(3);
  });

  it('serves the config from cache until a shortcut change invalidates it', async () => {
    const category = await seedCategory();
    const shortcut = await seedShortcut(category.id, { title: 'Before' });
    cachedSlugs.push(category.slug);

    const first = await storefrontShortcutService.getStorefrontConfigBySlug(category.slug);
    expect(first.shortcuts[0]?.title).toBe('Before');

    // An edit that does not pass through the service writes the database, not
    // the cache: the next read must still serve the cached copy, which is what
    // proves the read was served from Redis.
    await prisma.storefrontShortcut.update({
      where: { id: shortcut.id },
      data: { title: 'Outside Edit' },
    });

    const cached = await storefrontShortcutService.getStorefrontConfigBySlug(category.slug);
    expect(cached.shortcuts[0]?.title).toBe('Before');

    // A service write invalidates the key, so the read after it is fresh.
    await storefrontShortcutService.updateStorefrontShortcut(shortcut.id, { displayOrder: 2 });

    const fresh = await storefrontShortcutService.getStorefrontConfigBySlug(category.slug);
    expect(fresh.shortcuts[0]?.title).toBe('Outside Edit');
  });

  it('keeps deactivated shortcuts visible to the admin listing, with their real state', async () => {
    const category = await seedCategory();
    const inactive = await seedShortcut(category.id, {
      title: 'Retired Row',
      isActive: false,
      displayOrder: 4,
    });

    const list = await storefrontShortcutService.getStorefrontShortcutsForCategory(category.id);

    const row = list.find((item) => item?.id === inactive.id);
    expect(row?.isActive).toBe(false);
    expect(row?.displayOrder).toBe(4);
  });
});
