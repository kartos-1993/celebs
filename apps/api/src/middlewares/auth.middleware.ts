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

  if (user.role === 'VENDOR' && !user.isEmailVerified) {
    return next(
      new ForbiddenException(
        'Email address is not verified. Please check your inbox for the verification link.',
        ErrorCode.VERIFICATION_ERROR,
      ),
    );
  }

  const vendorProfile = user.vendorProfile;
  if (!vendorProfile || vendorProfile.status !== 'APPROVED') {
    const message =
      user.role === 'STAFF'
        ? 'Access denied: Parent seller store must be approved by platform administration before accessing catalog tools.'
        : 'Access denied: Your seller profile must be approved by platform administration before accessing catalog tools.';

    return next(new ForbiddenException(message, ErrorCode.FORBIDDEN_ACCESS));
  }

  next();
};
