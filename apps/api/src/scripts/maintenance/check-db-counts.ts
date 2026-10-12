import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../../.env.development') });

import prisma from '../../config/db.prisma';

async function main() {
  const counts = {
    products: await prisma.product.count(),
    inventories: await prisma.productInventory.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    consignments: await prisma.consignment.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    settlementBatches: await prisma.settlementBatch.count(),
    sellerStatements: await prisma.sellerStatement.count(),
    notifications: await prisma.notification.count(),
    pushTokens: await prisma.pushToken.count(),
    stockReservations: await prisma.stockReservationLedger.count(),
    carts: await prisma.cart.count(),
    cartItems: await prisma.cartItem.count(),
    reviews: await prisma.review.count(),
    reviewLikes: await prisma.reviewLike.count(),
    reviewSummaries: await prisma.productReviewSummary.count(),
    wishlistItems: await prisma.wishlistItem.count(),
    comboItems: await prisma.comboBundleItem.count(),
    campaignProducts: await prisma.campaignProduct.count(),
    outboxEvents: await prisma.outboxEvent.count(),
    // Master data
    users: await prisma.user.count(),
    vendors: await prisma.vendorProfile.count(),
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    warehouses: await prisma.warehouse.count(),
    logisticsCities: await prisma.logisticsCity.count(),
    logisticsZones: await prisma.logisticsZone.count(),
    shippingRates: await prisma.shippingRate.count(),
  };

  console.log('--- DATABASE RECORD COUNTS ---');
  console.log(JSON.stringify(counts, null, 2));

  const brands = await prisma.brand.findMany({ select: { id: true, name: true, slug: true } });
  console.log('--- BRANDS ---', brands);

  const vendors = await prisma.vendorProfile.findMany({
    select: { id: true, shopName: true, userId: true },
  });
  console.log('--- VENDORS ---', vendors);

  const cats = await prisma.category.findMany({
    where: {
      slug: { in: ['men', 'men-denim', 'men-jeans', 'men-jackets-and-coats', 'men-denim-jackets'] },
    },
    select: { id: true, name: true, slug: true, level: true, parentCategory: true },
  });
  console.log('--- CATEGORIES ---', cats);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
