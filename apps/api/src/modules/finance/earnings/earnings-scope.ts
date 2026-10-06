import { Request } from 'express';

import { Permission } from '@celebs/rbac';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

/**
 * Which seller's earnings a request may read.
 *
 * A seller always reads their own, and cannot read another's by guessing an id -
 * that check lives here rather than in a route guard because the route cannot know
 * who is asking until it looks at the session's store.
 *
 * ADMIN and SUPERADMIN may read any seller's, which is what support needs. They
 * have no store of their own, so they must name one.
 *
 * The rule is intentionally not "403 if you ask for someone else": returning the
 * caller's own figures instead keeps a probing request from revealing whether a
 * given seller id exists at all.
 */
export function resolveVendorForRead(req: Request): string {
  const actor = req.actor;

  if (!actor) {
    throw new AppError('Not signed in', HTTPSTATUS.UNAUTHORIZED, ErrorCode.UNAUTHORIZED_ACCESS);
  }

  const requested =
    typeof req.query.vendorId === 'string' && req.query.vendorId.length > 0
      ? req.query.vendorId
      : null;

  const canReadOthers = actor.permissions.includes(Permission.FINANCE_PLATFORM_VIEW);

  if (requested) {
    if (canReadOthers) return requested;

    // A seller naming someone else gets their own figures, never an error that
    // confirms the other id exists.
    return requireOwnStore(req);
  }

  if (canReadOthers) {
    throw new AppError(
      'Name the seller whose earnings you want to read',
      HTTPSTATUS.BAD_REQUEST,
      ErrorCode.INVALID_REQUEST,
    );
  }

  return requireOwnStore(req);
}

function requireOwnStore(req: Request): string {
  const storeId = req.store?.id;

  if (!storeId) {
    throw new AppError(
      'This account is not associated with a seller store',
      HTTPSTATUS.FORBIDDEN,
      ErrorCode.FORBIDDEN_ACCESS,
    );
  }

  return storeId;
}
