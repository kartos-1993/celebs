import prisma from '@/db';

export class UserService {
  public async findUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        vendorProfile: true,
        vendor: true,
      },
    });

    if (!user) return null;

    const { vendor, vendorProfile, ...userWithoutVendor } = user;
    const effectiveVendorProfile = vendorProfile || vendor;
    return {
      ...userWithoutVendor,
      vendorProfile: effectiveVendorProfile || null,
    };
  }
}
