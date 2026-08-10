import prisma, { Prisma } from '@/config/db.prisma';

export class ComboRepository {
  async findActiveCombos(tag?: string) {
    const where: Prisma.ComboBundleWhereInput = { isActive: true };
    if (tag) where.tag = tag;

    return prisma.comboBundle.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllCombos() {
    return prisma.comboBundle.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    return prisma.comboBundle.findUnique({
      where: { slug },
      include: {
        items: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.comboBundle.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  async create(data: Prisma.ComboBundleCreateInput) {
    return prisma.comboBundle.create({
      data,
      include: {
        items: true,
      },
    });
  }

  async update(id: string, data: Prisma.ComboBundleUpdateInput, productIds?: string[]) {
    if (productIds) {
      await prisma.comboBundleItem.deleteMany({ where: { bundleId: id } });
    }

    return prisma.comboBundle.update({
      where: { id },
      data,
      include: {
        items: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.comboBundle.delete({
      where: { id },
    });
  }

  async findProductsByIds(ids: string[]) {
    return prisma.product.findMany({ where: { id: { in: ids } } });
  }
}

export const comboRepository = new ComboRepository();
