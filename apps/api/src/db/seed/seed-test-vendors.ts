import { hashValue } from '../../common/utils/bcrypt';
import prisma from '../../config/db.prisma';

export const TEST_VENDORS = [
  {
    name: 'Vendor One (Himalayan Apparel)',
    email: 'vendor1@celebs.test',
    shopName: 'Himalayan Apparel Lab',
    shopDescription: 'Premium handcrafted Himalayan outerwear and knitwear',
    phoneNumber: '9841000001',
    panNumber: 'PAN-100000001',
    citizenshipNumber: 'CIT-100000001',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    cityArea: 'Durbar Marg, Ward 1',
  },
  {
    name: 'Vendor Two (Patan Silk)',
    email: 'vendor2@celebs.test',
    shopName: 'Patan Silk & Pashmina',
    shopDescription: 'Authentic pure cashmere pashmina and traditional silks',
    phoneNumber: '9841000002',
    panNumber: 'PAN-100000002',
    citizenshipNumber: 'CIT-100000002',
    province: 'Bagmati Province',
    district: 'Lalitpur',
    cityArea: 'Patan Durbar Square, Ward 3',
  },
  {
    name: 'Vendor Three (Pokhara Outdoor)',
    email: 'vendor3@celebs.test',
    shopName: 'Pokhara Outdoor Outfitters',
    shopDescription: 'Trekking gear, windbreakers, and high-altitude apparel',
    phoneNumber: '9841000003',
    panNumber: 'PAN-100000003',
    citizenshipNumber: 'CIT-100000003',
    province: 'Gandaki Province',
    district: 'Kaski',
    cityArea: 'Lakeside, Ward 6',
  },
  {
    name: 'Vendor Four (Bhaktapur Crafts)',
    email: 'vendor4@celebs.test',
    shopName: 'Bhaktapur Heritage Crafts',
    shopDescription: 'Handmade traditional garments, Dhaka topis, and accessories',
    phoneNumber: '9841000004',
    panNumber: 'PAN-100000004',
    citizenshipNumber: 'CIT-100000004',
    province: 'Bagmati Province',
    district: 'Bhaktapur',
    cityArea: 'Taumadhi Square, Ward 2',
  },
  {
    name: 'Vendor Five (Everest Leather)',
    email: 'vendor5@celebs.test',
    shopName: 'Everest Leather Goods',
    shopDescription: 'Full-grain leather jackets, boots, and everyday travel accessories',
    phoneNumber: '9841000005',
    panNumber: 'PAN-100000005',
    citizenshipNumber: 'CIT-100000005',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    cityArea: 'Thamel, Ward 26',
  },
  {
    name: 'Vendor Six (Annapurna Sports)',
    email: 'vendor6@celebs.test',
    shopName: 'Annapurna Sports Gear',
    shopDescription: 'Athletic wear, activewear, and running essentials',
    phoneNumber: '9841000006',
    panNumber: 'PAN-100000006',
    citizenshipNumber: 'CIT-100000006',
    province: 'Gandaki Province',
    district: 'Kaski',
    cityArea: 'New Road, Pokhara',
  },
  {
    name: 'Vendor Seven (Namche Footwear)',
    email: 'vendor7@celebs.test',
    shopName: 'Namche Footwear Studio',
    shopDescription: 'Handcrafted leather boots and urban sneakers',
    phoneNumber: '9841000007',
    panNumber: 'PAN-100000007',
    citizenshipNumber: 'CIT-100000007',
    province: 'Bagmati Province',
    district: 'Lalitpur',
    cityArea: 'Jhamsikhel, Ward 3',
  },
  {
    name: 'Vendor Eight (Mustang Woolens)',
    email: 'vendor8@celebs.test',
    shopName: 'Mustang Woolen Mills',
    shopDescription: 'Organic yak wool sweaters, mufflers, and winter blankets',
    phoneNumber: '9841000008',
    panNumber: 'PAN-100000008',
    citizenshipNumber: 'CIT-100000008',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    cityArea: 'Boudha, Ward 6',
  },
  {
    name: 'Vendor Nine (Chitwan Cotton)',
    email: 'vendor9@celebs.test',
    shopName: 'Chitwan Cotton Collective',
    shopDescription: '100% organic cotton shirts, linen pants, and summer apparel',
    phoneNumber: '9841000009',
    panNumber: 'PAN-100000009',
    citizenshipNumber: 'CIT-100000009',
    province: 'Bagmati Province',
    district: 'Chitwan',
    cityArea: 'Bharatpur, Ward 10',
  },
  {
    name: 'Vendor Ten (Dharan Streetwear)',
    email: 'vendor10@celebs.test',
    shopName: 'Dharan Streetwear Co.',
    shopDescription: 'Contemporary oversized tees, hoodies, and cargo pants',
    phoneNumber: '9841000010',
    panNumber: 'PAN-100000010',
    citizenshipNumber: 'CIT-100000010',
    province: 'Koshi Province',
    district: 'Sunsari',
    cityArea: 'Bhanu Chowk, Dharan',
  },
];

const DEFAULT_PASSWORD = 'Password123!';

export async function seedTestVendors(): Promise<void> {
  console.log('\n🏪 Seeding 10 Test Vendors (Password: Password123!)...');
  const hashedPassword = await hashValue(DEFAULT_PASSWORD);

  for (const [i, item] of TEST_VENDORS.entries()) {
    let user = await prisma.user.findUnique({
      where: { email: item.email },
      include: { vendorProfile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: item.name,
          email: item.email,
          password: hashedPassword,
          role: 'VENDOR',
          isEmailVerified: true,
        },
        include: { vendorProfile: true },
      });
    }

    let vendor = user.vendorProfile;
    if (!vendor) {
      vendor = await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          shopName: item.shopName,
          shopDescription: item.shopDescription,
          phoneNumber: item.phoneNumber,
          panNumber: item.panNumber,
          citizenshipNumber: item.citizenshipNumber,
          status: 'APPROVED',
          onboardingStep: 4,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { vendorId: vendor.id },
      });
    }

    // Provision Warehouse details
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: { vendorProfileId: vendor.id },
    });

    if (!existingWarehouse) {
      await prisma.warehouse.create({
        data: {
          vendorProfileId: vendor.id,
          label: 'Primary Warehouse',
          contactName: item.name,
          contactPhone: item.phoneNumber,
          addressLine1: item.cityArea,
          city: item.district,
          district: item.district,
          province: item.province,
          country: 'Nepal',
          isBusinessAddress: true,
          isReturnAddress: true,
        },
      });
    }

    // Ensure default albums exist (Main Catalog, Color Swatches, Lookbooks)
    const defaultAlbums = ['Main Catalog', 'Color Swatches', 'Lookbooks'];
    for (const name of defaultAlbums) {
      const existing = await prisma.mediaFolder.findFirst({
        where: { vendorId: vendor.id, name, parentId: null },
      });
      if (!existing) {
        await prisma.mediaFolder.create({
          data: {
            vendorId: vendor.id,
            name,
            parentId: null,
          },
        });
      }
    }

    console.log(`  └─ [${i + 1}/10] Ready: ${item.email} → ${item.shopName} (${vendor.id})`);
  }

  console.log('✅ All 10 Test Vendors successfully seeded and ready to log in!');
}

if (require.main === module) {
  seedTestVendors()
    .catch((err) => {
      console.error('Failed to seed test vendors:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
