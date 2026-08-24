import { logger } from '@celebs/shared-utils';

import { mailQueue } from './queue.service';

import { config } from '@/config/app.config';
import { type MailParams, sendEmail } from '@/mailers/mailer';

/**
 * Enqueue a transactional email instead of blocking the request on SMTP /
 * Brevo (hundreds of ms – seconds). Processed by modules/mail/mail.worker.
 *
 * - In test env: sends inline so specs can assert against the mailer mock.
 * - If the queue is unreachable: degrades to inline send — an email must
 *   never be silently dropped because Redis is down.
 */
export async function enqueueMail(params: MailParams): Promise<void> {
  if (config.NODE_ENV === 'test') {
    await sendEmail(params);
    return;
  }

  try {
    await mailQueue.add('send', params);
    logger.info({ to: params.to, subject: params.subject }, 'Email queued for delivery');
  } catch (err) {
    logger.warn(
      { err, to: params.to, subject: params.subject },
      'Mail queue unavailable — falling back to inline send',
    );
    await sendEmail(params);
  }
}
