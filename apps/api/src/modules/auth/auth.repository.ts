import { Session, User, VerificationCode } from '@prisma/client';

import { ensurePlatformVendor, PLATFORM_SYSTEM_EMAIL } from '@/common/constants/platform-vendor';
import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { fortyFiveMinutesFromNow } from '@/common/utils/date-time';
import prisma, { Prisma } from '@/config/db.prisma';

export class AuthRepository {
  public async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  public async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async findUserWithVendor(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        vendorProfile: {
          include: {
            warehouses: true,
          },
        },
      },
    });
  }

  public async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  public async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  public async findSuperadmin(): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        role: 'SUPERADMIN',
        email: { not: PLATFORM_SYSTEM_EMAIL },
      },
    });
  }

  public async purgePhantomPlatformUsers(): Promise<void> {
    await prisma.user
      .deleteMany({
        where: { email: PLATFORM_SYSTEM_EMAIL },
      })
      .catch(() => {});
  }

  public async provisionPlatformVendor(userId: string): Promise<void> {
    await ensurePlatformVendor(prisma, userId);
  }

  public async createSession(data: {
    userId: string;
    userAgent?: string;
    rotatedRefreshId?: string;
    expiredAt?: Date;
  }): Promise<Session> {
    return prisma.session.create({
      data,
    });
  }

  public async findSessionWithUser(sessionId: string) {
    return prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            vendorProfile: {
              include: {
                warehouses: true,
              },
            },
          },
        },
      },
    });
  }

  public async slideSession(sessionId: string, expiredAt: Date, rotatedRefreshId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        expiredAt,
        rotatedRefreshId,
      },
    });
  }

  public async slideSessionCas(
    sessionId: string,
    expectedJti: string,
    newJti: string,
    expiredAt: Date,
  ): Promise<boolean> {
    const result = await prisma.session.updateMany({
      where: {
        id: sessionId,
        rotatedRefreshId: expectedJti,
      },
      data: {
        expiredAt,
        rotatedRefreshId: newJti,
      },
    });
    return result.count > 0;
  }

  public async deleteAllUserSessions(userId: string): Promise<string[]> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await prisma.session.deleteMany({
        where: { userId },
      });
    }
    return sessionIds;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await prisma.session
      .delete({
        where: { id: sessionId },
      })
      .catch(() => {
        // Idempotent deletion
      });
  }

  public async createVerificationCode(userId: string): Promise<VerificationCode> {
    return prisma.verificationCode.create({
      data: {
        userId,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
      },
    });
  }

  public async findValidVerificationCode(code: string): Promise<VerificationCode | null> {
    return prisma.verificationCode.findFirst({
      where: {
        type: VerificationEnum.EMAIL_VERIFICATION,
        code,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  public async findLatestVerificationCode(userId: string): Promise<VerificationCode | null> {
    return prisma.verificationCode.findFirst({
      where: {
        userId,
        type: VerificationEnum.EMAIL_VERIFICATION,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async deleteUserVerificationCodes(userId: string): Promise<void> {
    await prisma.verificationCode.deleteMany({
      where: {
        userId,
        type: VerificationEnum.EMAIL_VERIFICATION,
      },
    });
  }

  public async deleteVerificationCodeById(id: string): Promise<void> {
    await prisma.verificationCode.delete({
      where: { id },
    });
  }
}

export const authRepository = new AuthRepository();
