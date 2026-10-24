import { Prisma, type Product } from '@prisma/client';

import { PRODUCT_STATUS } from '@celebs/shared-types';

import { PRODUCT_DETAIL_INCLUDE, PRODUCT_PUBLIC_DETAIL_SELECT } from './product-projections';

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

  findPublicDetailById(id: string, db: DbClient = this.db) {
    return getDelegate(db).findFirst({
      where: { id, status: PRODUCT_STATUS.PUBLISHED },
      select: PRODUCT_PUBLIC_DETAIL_SELECT,
    });
  }

  findStoreDetailById(id: string, storeId: string, db: DbClient = this.db) {
    return getDelegate(db).findFirst({
      where: { id, vendorId: storeId, status: { not: PRODUCT_STATUS.ARCHIVED } },
      include: PRODUCT_DETAIL_INCLUDE,
    });
  }

  findAdminDetailById(id: string, db: DbClient = this.db) {
    return getDelegate(db).findUnique({
      where: { id },
      include: PRODUCT_DETAIL_INCLUDE,
    });
  }

  findDetailedById(id: string, isElevated = false, db: DbClient = this.db) {
    return isElevated ? this.findAdminDetailById(id, db) : this.findPublicDetailById(id, db);
  }

  findManyList(args: Prisma.ProductFindManyArgs, db: DbClient = this.db) {
    return getDelegate(db).findMany(args);
  }

  count(where: Prisma.ProductWhereInput = {}, db: DbClient = this.db): Promise<number> {
    return getDelegate(db).count({ where });
  }

  findByIdOrThrow(id: string, db: DbClient = this.db): Promise<Product> {
    return getDelegate(db).findUniqueOrThrow({ where: { id } });
  }

  existsBySlug(slug: string, db: DbClient = this.db): Promise<boolean> {
    return getDelegate(db)
      .findUnique({ where: { slug }, select: { id: true } })
      .then((row) => row !== null);
  }

  create(data: Prisma.ProductUncheckedCreateInput, tx: TxClient = this.db as TxClient) {
    return tx.product.create({ data, include: PRODUCT_DETAIL_INCLUDE });
  }

  update(id: string, data: Prisma.ProductUncheckedUpdateInput, tx: TxClient = this.db as TxClient) {
    // DETAIL_INCLUDE is a superset of the list/review projections, so single
    // lifecycle writes reuse it instead of bespoke includes.
    return tx.product.update({ where: { id }, data, include: PRODUCT_DETAIL_INCLUDE });
  }
}

export const productRepository = new ProductRepository();
