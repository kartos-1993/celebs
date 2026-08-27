import { Request, Response } from 'express';

import { IApiResponse } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, NotFoundException } from '@celebs/shared-utils';

import { SessionService } from './session.service';

import { verifyJwtToken } from '@/common/utils/jwt';

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
    const response: IApiResponse<typeof session> = {
      success: true,
      message: 'Session retrieved successfully',
      data: session,
    };
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(HTTPSTATUS.OK).json(response); // Return the session data
  });
}
