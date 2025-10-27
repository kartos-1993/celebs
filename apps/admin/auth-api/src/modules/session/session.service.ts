import { NotFoundException } from '../../common/utils/catch-errors';
import prisma from '../../db';

export class SessionService {
  public async getSessionById(sessionId: string): Promise<any> {
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
            isEmailVerified: true,
            createdAt: true,
            updatedAt: true,
            // Explicitly omit the password field by not selecting it
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }
}
