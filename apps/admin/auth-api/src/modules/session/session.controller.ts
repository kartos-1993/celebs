import { IApiResponse } from './../../common/interface/api-response.interface';
import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { SessionService } from './session.service';
import { HTTPSTATUS } from '../../config/http.config';
import { NotFoundException } from '../../common/utils/catch-errors';
import { verifyJwtToken } from '../../common/utils/jwt';

export class SessionController {
  private sessionService: SessionService;
  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }
  public getSession = asyncHandler(async (req: Request, res: Response) => {
    // Extract sessionId from JWT token in cookie
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      throw new NotFoundException('Access token not found, Please login');
    }

    // Use the existing verifyJwtToken utility
    const result = verifyJwtToken(accessToken);

    if (result.error) {
      throw new NotFoundException('Invalid access token, Please login');
    }

    const sessionId = result.payload?.sessionId;

    if (!sessionId) {
      throw new NotFoundException(
        'Session ID not found in token, Please login'
      );
    }

    const session = await this.sessionService.getSessionById(sessionId);
    const response: IApiResponse<typeof session> = {
      success: true,
      message: 'Session retrieved successfully',
      data: session,
    };
    res.status(HTTPSTATUS.OK).json(response); // Return the session data
  });
}
