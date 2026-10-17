import { Router } from 'express';

import { storefrontController } from './storefront.controller';

import { publicCache } from '@/common/http/cache-policy.middleware';
import { optionalAuthenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';

const storefrontRoutes = Router();

// Public composite endpoint for mobile & web storefronts
storefrontRoutes.get(
  '/home',
  optionalAuthenticateJWT,
  searchRateLimiter,
  publicCache({ maxAge: 60, sMaxAge: 300, swr: 60 }),
  storefrontController.getHomeComposite,
);

export default storefrontRoutes;
