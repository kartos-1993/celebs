import { Router } from 'express';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';

const sessionService = new SessionService();
const sessionController = new SessionController(sessionService);

const sessionRoutes = Router();

// No JWT authentication middleware required as sessionId is sent in headers
sessionRoutes.get('/', sessionController.getSession);

export default sessionRoutes;
