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

  /**
   * The hydrated cart line, with everything the canonical cover resolver needs.
   *
   * `cover` is DERIVED, not a column, so it cannot be projected here — but it
   * cannot be derived upstream either unless both of its inputs are loaded.
   * That is exactly what this `select` does: `mainImages` AND `colorVariants`
   * travel together so `CartService.getCart` can hand both to the single
   * process-wide resolver (`product/utils/product-image.util.resolveCover`) and
   * derive the line's `cover`. Dropping either column here silently
   * downgrades every cover-less product to a blank tile; it is a single-query
   * payload on a product already joined, not a second round trip.
   */
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
    const carts = await prisma.cart.findMany({
      where: { sessionId },
      select: { id: true },
    });
    if (carts.length === 0) return { count: 0 };
    const cartIds = carts.map((c) => c.id);
    await prisma.cartItem.deleteMany({
      where: { cartId: { in: cartIds } },
    });
    return prisma.cart.deleteMany({
      where: { id: { in: cartIds } },
    });
  }
}

export const cartRepository = new CartRepository();
