import { Job, Worker } from 'bullmq';

import { logger } from '@celebs/shared-utils';

import { checkoutService } from './checkout/checkout.service';

import { redisConnection, WORKER_DRAIN_DELAY_SECONDS } from '@/common/services/queue.service';

export const orderReservationWorker = new Worker(
  'order-maintenance',
  async (job: Job) => {
    if (job.name === 'release-stale-reservations') {
      logger.info('Starting scheduled stale order reservation release...');
      try {
        const result = await checkoutService.releaseStaleReservations();
        logger.info(
          { cancelledOrders: result.cancelledOrders },
          'Stale order reservation release completed successfully',
        );
        return result;
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errMsg }, 'Failed to release stale order reservations');
        throw error;
      }
    }
    return { ignored: true };
  },
  {
    connection: redisConnection,
    concurrency: 1,
    drainDelay: WORKER_DRAIN_DELAY_SECONDS,
  },
);
