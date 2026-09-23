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
              select: {
                id: true,
                shopName: true,
                status: true,
              },
            },
            vendor: {
              select: {
                id: true,
                shopName: true,
                status: true,
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

  public async findSessionsByUserIds(userIds: string[]) {
    return prisma.session.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
  }

  public async deleteSessionsByUserIds(userIds: string[]): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: { userId: { in: userIds } },
    });
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();
