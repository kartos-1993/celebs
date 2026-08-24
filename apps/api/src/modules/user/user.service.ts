import prisma from '@/config/db.prisma';

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

  /**
   * Lean identity projection for per-request JWT resolution.
   *
   * Excludes the password hash and wide relations — includes only what
   * actor-context, store guards, and controllers read from `req.user`
   * (id, name, email, role, permissions, isEmailVerified, vendorId,
   * vendorProfile.id). Runs on EVERY authenticated request; keep it tight.
   */
  public async findAuthPrincipal(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isEmailVerified: true,
        vendorId: true,
        vendorProfile: { select: { id: true } },
      },
    });
  }
}
