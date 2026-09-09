import { renderButton, renderEmailLayout, renderInfoCard } from './email-layout';

import { buildWebUrl } from '@/common/utils/url';

export const vendorApprovalTemplate = (shopName: string) => {
  const subject = 'Congratulations! Your Vendor Application is Approved';
  const portalUrl = buildWebUrl('/login');

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Vendor Application Approved 🎉
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Hello <strong>${shopName}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Great news! Your vendor profile and store verification documents have been <strong>approved</strong> by our team. You can now log in to your seller portal to add catalog products, manage inventory, and start selling.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      ${renderButton('Go to Seller Portal', portalUrl)}
    </div>

    <p style="margin: 20px 0 0 0; font-size: 14px; color: #64748B; line-height: 1.5;">
      Welcome aboard,<br />
      <strong>The Celebs Platform Team</strong>
    </p>
  `;

  return {
    subject,
    text: `Hello ${shopName},\n\nYour vendor application has been approved by the Celebs moderation team! You can now log in to your seller portal (${portalUrl}), upload catalog products, and start receiving orders.\n\nThank you for partnering with Celebs.`,
    html: renderEmailLayout({
      title: subject,
      previewText: `Your vendor application for ${shopName} has been approved!`,
      contentHtml,
    }),
  };
};

export const vendorRejectionTemplate = (shopName: string, reason: string) => {
  const subject = 'Update on Your Vendor Application Status';
  const onboardingUrl = buildWebUrl('/onboarding');
  const safeReason =
    reason || 'Please review your document uploads and business details for clarity.';

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Vendor Application Needs Revision
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Hello <strong>${shopName}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Thank you for submitting your vendor application. Our moderation team reviewed your details and found items that require updates before we can activate your account.
    </p>

    ${renderInfoCard(
      `
        <strong style="color: #991B1B; font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;">Moderation Feedback</strong>
        <p style="margin: 6px 0 0 0; color: #7F1D1D; font-size: 14px;">${safeReason}</p>
      `,
      'danger',
    )}

    <p style="margin: 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Please log in to your onboarding portal to update the flagged details and resubmit for verification.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      ${renderButton('Update Application & Resubmit', onboardingUrl)}
    </div>

    <p style="margin: 20px 0 0 0; font-size: 14px; color: #64748B; line-height: 1.5;">
      Thank you,<br />
      <strong>The Celebs Moderation Team</strong>
    </p>
  `;

  return {
    subject,
    text: `Hello ${shopName},\n\nYour vendor application requires changes before approval.\n\nFeedback / Reason: ${safeReason}\n\nPlease visit ${onboardingUrl} to update your profile and resubmit.\n\nThank you,\nCelebs Moderation Team`,
    html: renderEmailLayout({
      title: subject,
      previewText: `Update required for your vendor application for ${shopName}.`,
      contentHtml,
    }),
  };
};
