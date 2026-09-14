import { config } from 'dotenv';
import path from 'path';

// Load .env.development if not already loaded
config({ path: path.resolve(__dirname, '../../../.env.development') });

import prisma from '../../config/db.prisma';

async function main() {
  console.log('🧹 Starting clean-slate purge for end-to-end product/order testing...');

  const beforeCounts = {
    products: await prisma.product.count(),
    inventories: await prisma.productInventory.count(),
    cartItems: await prisma.cartItem.count(),
    carts: await prisma.cart.count(),
    orderItems: await prisma.orderItem.count(),
    orders: await prisma.order.count(),
  };

  console.log('📊 Current database state:', beforeCounts);

  // 1. Stock reservations & Cart items
  console.log('🗑️  Deleting stock reservations, cart items, and carts...');
  await prisma.stockReservationLedger.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});

  // 2. Order tracking, payments, items, and orders
  console.log('🗑️  Deleting test orders, tracking events, and payments...');
  await prisma.orderTrackingEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  // 3. Wishlists & reviews
  console.log('🗑️  Deleting wishlists and reviews...');
  await prisma.wishlistItem.deleteMany({});
  await prisma.review.deleteMany({});

  // 4. Marketing bundles & campaigns linking to products
  console.log('🗑️  Cleaning campaign and combo bundle product links...');
  await prisma.comboBundleItem.deleteMany({});
  await prisma.campaignProduct.deleteMany({});

  // 5. Product inventory and products
  console.log('🗑️  Deleting product inventories and products...');
  await prisma.productInventory.deleteMany({});
  await prisma.product.deleteMany({});

  const afterCounts = {
    products: await prisma.product.count(),
    inventories: await prisma.productInventory.count(),
    cartItems: await prisma.cartItem.count(),
    carts: await prisma.cart.count(),
    orderItems: await prisma.orderItem.count(),
    orders: await prisma.order.count(),
    // Preserved references
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    optionSets: await prisma.optionSet.count(),
    warehouses: await prisma.warehouse.count(),
    vendors: await prisma.vendorProfile.count(),
  };

  console.log('\n✅ Successfully cleared all test products, carts, and orders!');
  console.log('📊 New database state:', afterCounts);
  console.log('\n✨ Preserved Reference Data:');
  console.log(`   - Brands: ${afterCounts.brands}`);
  console.log(`   - Categories: ${afterCounts.categories}`);
  console.log(`   - OptionSets: ${afterCounts.optionSets}`);
  console.log(`   - Warehouses: ${afterCounts.warehouses}`);
  console.log(`   - Vendors: ${afterCounts.vendors}`);
  console.log(
    '\nYou now have a pristine catalog ready for end-to-end testing from Product Upload to Delivery!',
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error during purge:', e);
  await prisma.$disconnect();
  process.exit(1);
});
