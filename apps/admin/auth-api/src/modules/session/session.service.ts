import { NotFoundException } from '../../common/utils/catch-errors';
import prisma from '../../db';

export class SessionService {
  public async getSessionById(sessionId: string): Promise<any> {
    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }
}
