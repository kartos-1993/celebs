import { randomUUID } from 'node:crypto';

import { generateSku } from '@celebs/shared-utils';

import prisma, { Prisma } from '@/config/db.prisma';

export class CartRepository {
  async findUnique(where: Prisma.CartWhereUniqueInput) {
    return prisma.cart.findUnique({
      where,
    });
  }

  async findUniqueWithItems(cartId: string) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            inventory: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findUniqueWithHydratedItems(where: Prisma.CartWhereUniqueInput) {
    return prisma.cart.findUnique({
      where,
      include: {
        items: {
          include: {
            inventory: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    brand: true,
                    price: true,
                    discountedPrice: true,
                    mainImages: true,
                    colorVariants: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async createCartForUser(userId: string) {
    return prisma.cart.create({
      data: { user: { connect: { id: userId } } },
    });
  }

  async createCartForSession(sessionId: string) {
    return prisma.cart.create({
      data: { sessionId },
    });
  }

  async update(id: string, data: Prisma.CartUpdateInput) {
    return prisma.cart.update({
      where: { id },
      data,
    });
  }

  async addItemToCart(cartId: string, inventoryId: string, quantity: number) {
    return prisma.cartItem.upsert({
      where: {
        cartId_inventoryId: { cartId, inventoryId },
      },
      create: {
        cart: { connect: { id: cartId } },
        inventory: { connect: { id: inventoryId } },
        quantity,
      },
      update: { quantity },
    });
  }

  async updateItem(id: string, data: Prisma.CartItemUpdateInput) {
    return prisma.cartItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string) {
    return prisma.cartItem.delete({
      where: { id },
    });
  }

  async deleteManyItems(where: Prisma.CartItemWhereInput) {
    return prisma.cartItem.deleteMany({
      where,
    });
  }

  async findInventoryById(inventoryId: string) {
    return prisma.productInventory.findUnique({
      where: { id: inventoryId },
    });
  }

  async findCartBySessionWithItems(sessionId: string) {
    return prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            inventory: {
              select: {
                productId: true,
                colorVariantName: true,
                size: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteCartBySession(sessionId: string) {
    return prisma.cart.deleteMany({
      where: { sessionId },
    });
  }

  async findProductById(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
  }

  async findProductsByIds(productIds: string[]) {
    if (productIds.length === 0) return [];
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
  }

  async findCartItem(cartId: string, inventoryId: string) {
    return prisma.cartItem.findUnique({
      where: {
        cartId_inventoryId: { cartId, inventoryId },
      },
      select: { quantity: true },
    });
  }

  async findCartItemsByInventoryIds(cartId: string, inventoryIds: string[]) {
    if (inventoryIds.length === 0) return [];
    return prisma.cartItem.findMany({
      where: { cartId, inventoryId: { in: inventoryIds } },
      select: { inventoryId: true, quantity: true },
    });
  }

  async findInventoriesByVariants(
    variants: Array<{ productId: string; colorVariantName: string; size: string }>,
  ) {
    if (variants.length === 0) return [];
    return prisma.productInventory.findMany({
      where: {
        OR: variants.map((r) => ({
          productId: r.productId,
          colorVariantName: r.colorVariantName,
          size: r.size,
        })),
      },
      select: {
        id: true,
        productId: true,
        colorVariantName: true,
        size: true,
        quantity: true,
        reservedQuantity: true,
      },
    });
  }

  async upsertCartItemAtomic(args: {
    cartId: string;
    productId: string;
    colorVariantName: string;
    size: string;
    quantity: number;
  }): Promise<{ availableStock: number } | null> {
    const { cartId, productId, colorVariantName, size, quantity } = args;

    const rows = await prisma.$queryRaw<Array<{ avail: number }>>`
      WITH inv_ins AS (
        INSERT INTO "ProductInventory"
          ("id", "product_id", "color_variant_name", "size", "sku", "quantity", "reserved_quantity", "createdAt", "updatedAt")
        SELECT
          ${randomUUID()},
          ${productId},
          ${colorVariantName},
          ${size},
          ${generateSku({ brandPrefix: 'c' })},
          COALESCE((
            SELECT (s ->> 'quantity')::int
            FROM "Product" p,
                 jsonb_array_elements(p."colorVariants") v,
                 jsonb_array_elements(v -> 'stocks') s
            WHERE p."id" = ${productId}
              AND lower(v ->> 'name') = lower(${colorVariantName})
              AND lower(s ->> 'size') = lower(${size})
            LIMIT 1
          ), 10),
          0,
          now(),
          now()
        WHERE EXISTS (SELECT 1 FROM "Product" WHERE "id" = ${productId})
        ON CONFLICT ("product_id", "color_variant_name", "size") DO NOTHING
        RETURNING "id", ("quantity" - "reserved_quantity") AS avail
      ),
      inv AS (
        SELECT "id", avail FROM inv_ins
        UNION ALL
        SELECT pi."id", pi."quantity" - pi."reserved_quantity" AS avail
        FROM "ProductInventory" pi
        WHERE pi."product_id" = ${productId}
          AND pi."color_variant_name" = ${colorVariantName}
          AND pi."size" = ${size}
        LIMIT 1
      ),
      item AS (
        INSERT INTO "CartItem"
          ("id", "cart_id", "inventory_id", "quantity", "createdAt", "updatedAt")
        SELECT ${randomUUID()}, ${cartId}, inv."id", ${quantity}, now(), now()
        FROM inv
        WHERE inv.avail >= ${quantity}
        ON CONFLICT ("cart_id", "inventory_id") DO UPDATE
          SET "quantity" = "CartItem"."quantity" + EXCLUDED."quantity",
              "updatedAt" = now()
          WHERE (
            -- CTEs are not referenceable inside DO UPDATE; re-read live stock.
            SELECT pi2."quantity" - pi2."reserved_quantity"
            FROM "ProductInventory" pi2
            WHERE pi2."id" = EXCLUDED."inventory_id"
          ) >= "CartItem"."quantity" + EXCLUDED."quantity"
        RETURNING "inventory_id"
      )
      SELECT inv.avail AS avail
      FROM item
      JOIN inv ON inv."id" = item."inventory_id"
    `;

    const row = rows[0];
    return row ? { availableStock: Number(row.avail) } : null;
  }

  async bulkUpsertCartItems(
    cartId: string,
    upserts: Array<{ inventoryId: string; quantity: number }>,
  ): Promise<void> {
    if (upserts.length === 0) return;
    const rowIds = upserts.map(() => randomUUID());
    await prisma.$executeRaw`
      INSERT INTO "CartItem" ("id", "cart_id", "inventory_id", "quantity", "createdAt", "updatedAt")
      SELECT b.id, ${cartId}, b.inv, b.qty, now(), now()
      FROM unnest(
        ${rowIds}::text[],
        ${upserts.map((u) => u.inventoryId)}::text[],
        ${upserts.map((u) => u.quantity)}::int[]
      ) AS b(id, inv, qty)
      ON CONFLICT ("cart_id", "inventory_id") DO UPDATE
        SET "quantity" = EXCLUDED."quantity",
            "updatedAt" = now()
    `;
  }
}

export const cartRepository = new CartRepository();
