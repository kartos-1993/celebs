import prisma from '@/config/db.prisma';

export class SessionRepository {
  public async findSessionWithUser(sessionId: string) {
    return prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        createdAt: true,
        expiredAt: true,
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
  }

  public async deleteExpiredSessions(cutoff: Date = new Date()): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiredAt: {
          lt: cutoff,
        },
      },
    });
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();
