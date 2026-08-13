import { NextFunction, Request, Response } from 'express';

import { ErrorCode, ForbiddenException, UnauthorizedException } from '@celebs/shared-utils';

export { authenticateJWT, optionalAuthenticateJWT } from '@/common/strategies/jwt.strategy';

export const requireApprovedVendor = (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(
      new UnauthorizedException('Authentication required', ErrorCode.UNAUTHORIZED_ACCESS),
    );
  }

  // Superadmin and Admin bypass vendor status check
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    return next();
  }

  if (user.role === 'VENDOR') {
    if (!user.isEmailVerified) {
      return next(
        new ForbiddenException(
          'Email address is not verified. Please check your inbox for the verification link.',
          ErrorCode.VERIFICATION_ERROR,
        ),
      );
    }

    if (!user.vendorProfile || user.vendorProfile.status !== 'APPROVED') {
      return next(
        new ForbiddenException(
          'Access denied: Your seller profile must be approved by platform administration before accessing catalog tools.',
          ErrorCode.FORBIDDEN_ACCESS,
        ),
      );
    }
  }

  if (user.role === 'STAFF') {
    const parentStatus = user.vendorProfile?.status;
    if (!parentStatus || parentStatus !== 'APPROVED') {
      return next(
        new ForbiddenException(
          'Access denied: Parent seller store must be approved by platform administration before accessing catalog tools.',
          ErrorCode.FORBIDDEN_ACCESS,
        ),
      );
    }
  }

  next();
};
