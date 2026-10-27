import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../../.env.development') });

import prisma from '../../config/db.prisma';

async function main() {
  console.log('🧹 Starting clean-slate purge of Orders, Notifications, and Ledger entries...');

  const beforeCounts = {
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    consignments: await prisma.consignment.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    settlementBatches: await prisma.settlementBatch.count(),
    sellerStatements: await prisma.sellerStatement.count(),
    notifications: await prisma.notification.count(),
    stockReservations: await prisma.stockReservationLedger.count(),
    cartItems: await prisma.cartItem.count(),
  };

  console.log('📊 Records before purge:', beforeCounts);

  // 1. Unlink any reviews from order/orderItem
  console.log('🔗 Unlinking reviews from orders...');
  await prisma.review.updateMany({
    data: {
      orderId: null,
      orderItemId: null,
    },
  });

  // 2. Delete financial records (Ledger, Statements, Batches)
  console.log('🗑️  Deleting ledger entries, seller statements, and settlement batches...');
  await prisma.ledgerEntry.deleteMany({});
  await prisma.sellerStatement.deleteMany({});
  await prisma.settlementBatch.deleteMany({});

  // 3. Delete notifications
  console.log('🗑️  Deleting notifications...');
  await prisma.notification.deleteMany({});

  // 4. Delete order-related child entities
  console.log('🗑️  Deleting order tracking, payments, refunds, and consignments...');
  await prisma.refund.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.consignment.deleteMany({});
  await prisma.orderTrackingEvent.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.stockReservationLedger.deleteMany({});
  await prisma.cartItem.deleteMany({});

  // 5. Delete Orders
  console.log('🗑️  Deleting all orders...');
  await prisma.order.deleteMany({});

  // 6. Reset Inventory Reserved Quantities to 0
  console.log('🔄 Resetting reserved quantities in product inventories to 0...');
  await prisma.productInventory.updateMany({
    data: { reservedQuantity: 0 },
  });

  // 7. Reset Vendor Balances to 0.00
  console.log('🔄 Resetting vendor balances to 0.00...');
  await prisma.vendorProfile.updateMany({
    data: {
      availableBalance: 0,
      withholdingEscrow: 0,
    },
  });

  const afterCounts = {
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    consignments: await prisma.consignment.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    settlementBatches: await prisma.settlementBatch.count(),
    sellerStatements: await prisma.sellerStatement.count(),
    notifications: await prisma.notification.count(),
    stockReservations: await prisma.stockReservationLedger.count(),
    cartItems: await prisma.cartItem.count(),
    // Preserved catalog & accounts
    products: await prisma.product.count(),
    inventories: await prisma.productInventory.count(),
    users: await prisma.user.count(),
    vendors: await prisma.vendorProfile.count(),
  };

  console.log('\n✅ Successfully purged all orders, notifications, and ledger entries!');
  console.log('📊 Records after purge:', afterCounts);
  console.log('\n✨ Preserved Catalog & Accounts:');
  console.log(`   - Products: ${afterCounts.products}`);
  console.log(`   - Inventories: ${afterCounts.inventories}`);
  console.log(`   - Users: ${afterCounts.users}`);
  console.log(`   - Vendors: ${afterCounts.vendors}`);
  console.log('\nReady for clean test orders!');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error during purge:', e);
  await prisma.$disconnect();
  process.exit(1);
});
