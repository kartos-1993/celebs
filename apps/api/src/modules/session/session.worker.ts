import { Job, Worker } from 'bullmq';

import { logger } from '@celebs/shared-utils';

import { SessionService } from './session.service';

import { redisConnection } from '@/common/services/queue.service';

const sessionService = new SessionService();

export const sessionWorker = new Worker(
  'session-maintenance',
  async (job: Job) => {
    if (job.name === 'purge-expired-sessions') {
      logger.info('Starting scheduled expired session purge...');
      try {
        const deletedCount = await sessionService.purgeExpiredSessions();
        logger.info({ deletedCount }, 'Expired session purge completed successfully');
        return { deletedCount };
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errMsg }, 'Failed to purge expired sessions');
        throw error;
      }
    }
    return { ignored: true };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);
