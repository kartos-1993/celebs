import { Job, Worker } from 'bullmq';

import { logger } from '@celebs/shared-utils';

import { redisConnection } from '@/common/services/queue.service';
import type { MailParams } from '@/mailers/mailer';
import { sendEmail } from '@/mailers/mailer';

export const mailWorker = new Worker(
  'mail-delivery',
  async (job: Job) => {
    if (job.name !== 'send') return { ignored: true };

    const params = job.data as MailParams;
    try {
      await sendEmail(params);
      logger.info(
        { jobId: job.id, to: params.to, subject: params.subject, attempt: job.attemptsMade + 1 },
        'Email delivered',
      );
      return { delivered: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // BullMQ retries with exponential backoff; final failure lands in
      // the failed-jobs set (removeOnFail: false) for manual replay.
      logger.error(
        { error: errMsg, jobId: job.id, to: params.to, subject: params.subject },
        `Email delivery failed (attempt ${job.attemptsMade + 1}/${job.opts?.attempts ?? '?'})`,
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
);
