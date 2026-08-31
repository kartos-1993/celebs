import { Router } from 'express';

import { SessionController } from './session.controller';
import { sessionService } from './session.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const sessionController = new SessionController(sessionService);

const sessionRoutes = Router();

// Session fetch is authenticated — defense-in-depth ownership check in service
sessionRoutes.get('/', authenticateJWT, sessionController.getSession);

export default sessionRoutes;
