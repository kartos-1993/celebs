import { Request, Response } from 'express';

import { asyncHandler, NotFoundException } from '@celebs/shared-utils';

import { SessionService } from './session.service';

import { verifyJwtToken } from '@/common/utils/jwt';
import { sendSuccess } from '@/common/utils/response.util';

export class SessionController {
  private sessionService: SessionService;
  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }
  public getSession = asyncHandler(async (req: Request, res: Response) => {
    let sessionId = (req.user as { sessionId?: string })?.sessionId;

    if (!sessionId) {
      const accessToken =
        req.cookies?.accessToken ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null);

      if (!accessToken) {
        throw new NotFoundException('Access token not found, Please login');
      }

      const result = verifyJwtToken(accessToken);
      if (result.error || !result.payload?.sessionId) {
        throw new NotFoundException('Invalid access token, Please login');
      }

      sessionId = result.payload.sessionId;
    }

    const actorUserId = (req.user as { id?: string })?.id;
    const session = await this.sessionService.getSessionById(sessionId, actorUserId);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return sendSuccess(res, session, 'Session retrieved successfully');
  });
}
