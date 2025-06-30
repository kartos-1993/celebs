import { Router } from 'express';
import { sessionController } from './session.module';

const sessionRoutes = Router();

// No JWT authentication middleware required as sessionId is sent in headers
sessionRoutes.get('/', sessionController.getSession);

export default sessionRoutes;
