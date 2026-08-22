export { authenticateJWT, optionalAuthenticateJWT } from '@/common/strategies/jwt.strategy';

// requireApprovedVendor was retired in favour of the declarative guard pipeline
// (see @/common/guards/store.guards):
//   requireStoreState(['APPROVED'])  — lifecycle gate with platform bypass
//   requireSellerContext()           — seller-context presence
//   requirePlatformActor()           — /admin jurisdiction
