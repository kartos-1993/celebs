import { Router } from 'express';

import { asyncHandler } from '@celebs/shared-utils';

import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import {
  requireSellerContext,
  requireStoreState,
  requireVerifiedEmail,
} from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const vendorService = new VendorService();
const vendorController = new VendorController(vendorService);

const vendorRoutes = Router();

/**
 * Self-service vendor endpoints, in two intent groups.
 *
 * Authentication alone used to be the only guard, so authorisation rested on an
 * accident: every handler looks the profile up by user id, and a CUSTOMER has no
 * profile, so they got a 404. That is authorisation-by-coincidence. It holds
 * until any flow creates a VendorProfile before the account is a seller, at which
 * point a CUSTOMER can rewrite shop details and push the profile into review.
 *
 * actorContext is safe here even though the controller only reads req.user: it
 * populates the store the guards below check, and changes nothing the handlers
 * already relied on.
 */

// Onboarding: a seller working through their own application, in any pre-approval
// state. Registration already assigns the VENDOR role (vendor.service), so these
// are reachable from PENDING onwards.
vendorRoutes.use(authenticateJWT, asyncHandler(actorContext), requireSellerContext);

vendorRoutes.get('/onboarding-status', asyncHandler(vendorController.getOnboardingStatus));
vendorRoutes.put('/profile', asyncHandler(vendorController.updateProfile));
vendorRoutes.put('/warehouse', asyncHandler(vendorController.updateWarehouse));
vendorRoutes.put('/documents', asyncHandler(vendorController.updateDocuments));
vendorRoutes.put('/business-info', asyncHandler(vendorController.updateBusinessInfo));
// Applications must not enter review with an unverified email address.
vendorRoutes.post(
  '/submit-for-review',
  requireVerifiedEmail,
  asyncHandler(vendorController.submitForReview),
);
vendorRoutes.post(
  '/resubmit',
  requireVerifiedEmail,
  asyncHandler(vendorController.resubmitForReview),
);

// Holiday mode is not onboarding: it changes whether a live storefront accepts
// orders. The service had no status gate at all, so a rejected or suspended store
// could still go in and out of holiday mode.
vendorRoutes.put(
  '/holiday-mode',
  requireStoreState(['APPROVED']),
  asyncHandler(vendorController.toggleHolidayMode),
);

export default vendorRoutes;
