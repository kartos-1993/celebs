import { Prisma, type Product } from '@prisma/client';

import { PRODUCT_DETAIL_INCLUDE } from './product-projections';

import prisma from '@/config/db.prisma';

type TxClient = Prisma.TransactionClient;
type DbClient = typeof prisma | TxClient;

const getDelegate = (db: DbClient) => (db as TxClient).product ?? prisma.product;

/**
 * Product persistence boundary (Clean Architecture repository).
 * Domain services orchestrate through this class and never touch Prisma directly.
 */
export class ProductRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  transaction<T>(fn: (tx: TxClient) => Promise<T>, opts?: { maxWait?: number; timeout?: number }) {
    return this.db.$transaction(fn, { maxWait: 5000, timeout: 10000, ...opts });
  }

  findById(id: string, db: DbClient = this.db): Promise<Product | null> {
    return getDelegate(db).findUnique({ where: { id } });
  }

  findByIdOrThrow(id: string, db: DbClient = this.db): Promise<Product> {
    return getDelegate(db).findUniqueOrThrow({ where: { id } });
  }

  existsBySlug(slug: string, db: DbClient = this.db): Promise<boolean> {
    return getDelegate(db)
      .findUnique({ where: { slug }, select: { id: true } })
      .then((row) => row !== null);
  }

  create(data: Prisma.ProductCreateInput, tx: TxClient) {
    return tx.product.create({ data, include: PRODUCT_DETAIL_INCLUDE });
  }

  update(id: string, data: Prisma.ProductUpdateInput, tx: TxClient) {
    return tx.product.update({ where: { id }, data, include: PRODUCT_DETAIL_INCLUDE });
  }
}

export const productRepository = new ProductRepository();
