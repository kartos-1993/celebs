import { Router } from 'express';

import { devLogsController } from './dev-logs.controller';

const devLogsRouter = Router();

devLogsRouter.get('/', devLogsController.getLogsDashboard);
devLogsRouter.get('/stream', devLogsController.streamLogs);

export default devLogsRouter;
