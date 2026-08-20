import { NotFoundException } from '@celebs/shared-utils';

import prisma from '@/db';

export class SessionService {
  public async getSessionById(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        // Select all fields for the Session model
        id: true,
        userId: true,
        userAgent: true,
        createdAt: true,
        expiredAt: true,
        // Select the User relation, but specify which User fields to return
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            permissions: true,
            isEmailVerified: true,
            createdAt: true,
            updatedAt: true,
            vendorId: true,
            vendorProfile: {
              include: {
                warehouses: true,
              },
            },
            vendor: {
              include: {
                warehouses: true,
              },
            },
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const { vendor, vendorProfile, ...userWithoutVendor } = session.user;
    const effectiveVendorProfile = vendorProfile || vendor;

    return {
      ...session,
      user: {
        ...userWithoutVendor,
        vendorProfile: effectiveVendorProfile || null,
      },
    };
  }

  public async purgeExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiredAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
