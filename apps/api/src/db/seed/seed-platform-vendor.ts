import prisma from '../../config/db.prisma';
import { ensurePlatformVendor } from '../../common/constants/platform-vendor';

export async function seedPlatformVendor(): Promise<void> {
  console.log('\n🏪 Provisioning 1P Platform Vendor Profile & Primary Warehouse...');
  const vendor = await ensurePlatformVendor(prisma);
  console.log(
    '✅ 1P Platform Vendor Profile status:',
    vendor ? `READY (${vendor.id}) -> ${vendor.shopName}` : 'FAILED (No Superadmin)',
  );
}

if (require.main === module) {
  seedPlatformVendor()
    .catch((err) => {
      console.error('Failed to seed 1P platform vendor:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
