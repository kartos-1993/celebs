import { ForbiddenException, NotFoundException } from '@celebs/shared-utils';

import { type SessionRepository, sessionRepository } from './session.repository';

export interface SessionServiceDeps {
  sessionRepo?: Partial<SessionRepository>;
}

export class SessionService {
  private sessionRepo: SessionRepository;

  constructor(deps: SessionServiceDeps = {}) {
    this.sessionRepo = (deps.sessionRepo ?? sessionRepository) as SessionRepository;
  }

  public async getSessionById(sessionId: string, actorUserId?: string) {
    const session = await this.sessionRepo.findSessionWithUser(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (actorUserId && session.userId !== actorUserId) {
      throw new ForbiddenException('You do not own this session');
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

  public async purgeExpiredSessions(): Promise<{ deletedSessions: number; deletedCodes: number }> {
    const [deletedSessions, deletedCodes] = await Promise.all([
      this.sessionRepo.deleteExpiredSessions(),
      this.sessionRepo.deleteExpiredVerificationCodes(),
    ]);
    return { deletedSessions, deletedCodes };
  }
}

export const sessionService = new SessionService();
