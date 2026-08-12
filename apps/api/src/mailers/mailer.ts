import axios from 'axios';
import nodemailer from 'nodemailer';

import { logger } from '@celebs/shared-utils';

import { config } from '@/config/app.config';

type Params = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
};

// Create a local SMTP transporter for MailHog (localhost:1025)
const smtpHost = process.env.SMTP_HOST || 'localhost';
const smtpPort = Number(process.env.SMTP_PORT) || 1025;
const localTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async ({
  to,
  from = `no-reply <${config.MAILER_SENDER}>`,
  subject,
  text,
  html,
}: Params) => {
  const apiKey = process.env.SMTP_API_KEY;

  // 1. Brevo HTTP API Transport (If SMTP_API_KEY is configured)
  if (apiKey) {
    try {
      const payload = {
        sender: { email: config.MAILER_SENDER || 'info@celebs.com.np', name: 'Celebs' },
        to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      };

      await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
      });
      logger.info({ to, subject }, 'Email sent successfully via Brevo HTTP API');
      return;
    } catch (err: unknown) {
      logger.warn({ err, to }, 'Brevo API call failed. Falling back to local SMTP / logger');
    }
  }

  // 2. Local SMTP Transport (MailHog localhost:1025)
  try {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    await localTransporter.sendMail({
      from: from || config.MAILER_SENDER || 'info@celebs.com.np',
      to: recipients,
      subject,
      text,
      html,
    });
    logger.info(
      { to: recipients, subject, mailhogUrl: 'http://localhost:8025' },
      'Email dispatched to MailHog SMTP (View at http://localhost:8025)',
    );
  } catch (err) {
    logger.warn(
      { err, to, subject },
      '[DEV FALLBACK] Failed to connect to MailHog SMTP. Email logged to console.',
    );
  }
};
