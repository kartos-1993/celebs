import prisma from '../../config/db.prisma';

/**
 * Foreign-key safe clean-slate purge shared by the master seed's `--reset`
 * path (`src/db/seed/index.ts`) and the maintenance `clean:reseed` script.
 *
 * Order matters: `Product.categoryId` is ON DELETE RESTRICT, `CartItem` and
 * `OrderItem` pin `ProductInventory` with RESTRICT, and finance/notification
 * rows reference orders. This is the order that makes `npm run seed:reset`
 * work on a database that has actually been used (cart lines created by the
 * lazy inventory fallback included).
 */
export async function purgeAllTestData(): Promise<void> {
  console.log('🧹 Executing foreign-key safe clean-slate purge...');

  // 1. Notifications
  console.log('  🗑️  Deleting notifications...');
  await prisma.notification.deleteMany({});

  // 2. Finance
  console.log('  🗑️  Deleting finance records (statements, batches, ledger entries)...');
  await prisma.sellerStatement.deleteMany({});
  await prisma.settlementBatch.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});

  // 3. Cart & Stock reservations
  console.log('  🗑️  Deleting stock reservations and carts...');
  await prisma.stockReservationLedger.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});

  // 4. Orders & Fulfillment
  console.log('  🗑️  Deleting orders, consignments, payments, refunds, and tracking...');
  await prisma.orderTrackingEvent.deleteMany({});
  await prisma.consignment.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  // 5. Customer Content & Marketing
  console.log('  🗑️  Deleting customer reviews, wishlists, and campaign links...');
  await prisma.reviewLike.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.productReviewSummary.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.comboBundleItem.deleteMany({});
  await prisma.campaignProduct.deleteMany({});

  // 6. Products & Inventories
  console.log('  🗑️  Deleting product inventories and products...');
  await prisma.productInventory.deleteMany({});
  await prisma.product.deleteMany({});

  // 7. Outbox events
  console.log('  🗑️  Deleting outbox events...');
  await prisma.outboxEvent.deleteMany({});

  console.log('  ✅ Clean-slate purge complete.');
}
