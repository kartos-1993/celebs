import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Router } from 'express';

import {
  assetQueue,
  mailQueue,
  notificationQueue,
  orderMaintenanceQueue,
  sessionQueue,
} from './queue.service';

import { config } from '@/config/app.config';

let serverAdapter: ExpressAdapter | null = null;

export function getBullBoardRouter(): Router {
  if (serverAdapter) {
    return serverAdapter.getRouter() as Router;
  }

  serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(`${config.BASE_PATH}/admin/queues`);

  createBullBoard({
    queues: [
      new BullMQAdapter(orderMaintenanceQueue),
      new BullMQAdapter(sessionQueue),
      new BullMQAdapter(mailQueue),
      new BullMQAdapter(assetQueue),
      new BullMQAdapter(notificationQueue),
    ],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Celebs Queue Dashboard',
      },
    },
  });

  return serverAdapter.getRouter() as Router;
}
