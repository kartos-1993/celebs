import { renderButton, renderEmailLayout } from './email-layout';

export const verifyEmailTemplate = (
  rawUrl: string,
  brandName: string = 'Celebs',
  brandColor: string = '#0F172A',
) => {
  // Standard URL sanitizer: Removes any accidental double slashes in paths while preserving http:// or https://
  const url = rawUrl.replace(/([^:]\/)\/+/g, '$1');
  const subject = `Activate your ${brandName} account`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Activate Your Account
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">
      Thank you for joining <strong>${brandName}</strong>. Please click the button below to verify your email address and complete your account setup.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0;">
      ${renderButton('Activate Account', url)}
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748B; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;">
        <a href="${url}" style="color: #0F172A; text-decoration: underline;">${url}</a>
      </p>
    </div>
  `;

  return {
    subject,
    text: `Welcome to ${brandName}! Please activate your account by clicking the following link: ${url}`,
    html: renderEmailLayout({
      title: subject,
      previewText: `Activate your ${brandName} account to get started.`,
      brandName,
      brandColor,
      contentHtml,
    }),
  };
};

export const passwordResetTemplate = (
  rawUrl: string,
  brandName: string = 'Celebs',
  brandColor: string = '#0F172A',
) => {
  const url = rawUrl.replace(/([^:]\/)\/+/g, '$1');
  const subject = `Reset your ${brandName} account password`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Password Reset Request
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">
      We received a request to reset the password for your <strong>${brandName}</strong> account. This link will expire in 15 minutes.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0;">
      ${renderButton('Reset Password', url)}
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748B; line-height: 1.5;">
        If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized access.
      </p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;">
        <a href="${url}" style="color: #0F172A; text-decoration: underline;">${url}</a>
      </p>
    </div>
  `;

  return {
    subject,
    text: `Reset your ${brandName} password by clicking the following link (expires in 15 minutes): ${url}`,
    html: renderEmailLayout({
      title: subject,
      previewText: `Password reset request for your ${brandName} account.`,
      brandName,
      brandColor,
      contentHtml,
    }),
  };
};
