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
