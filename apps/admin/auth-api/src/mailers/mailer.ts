import axios from 'axios';
import { config } from '../config/app.config';

type Params = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
};

export const sendEmail = async ({
  to,
  from = `no-reply <${config.MAILER_SENDER}>`,
  subject,
  text,
  html,
}: Params) => {
  const apiKey = process.env.SMTP_API_KEY;
  if (!apiKey) throw new Error('Brevo API key not set');

  const payload = {
    sender: { email: config.MAILER_SENDER, name: 'Celebs' },
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
};
