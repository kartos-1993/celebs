import { Router } from 'express';

import { storefrontController } from './storefront.controller';

const storefrontRoutes = Router();

// Public composite endpoint for mobile & web storefronts
storefrontRoutes.get('/home', storefrontController.getHomeComposite);

export default storefrontRoutes;
